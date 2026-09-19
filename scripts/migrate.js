#!/usr/bin/env node
// Applies any not-yet-applied migrations/*.sql files to
// POSTGRES_URL_NON_POOLING (falling back to POSTGRES_URL), in order,
// tracking what's been applied in a schema_migrations table.
//
// Runs automatically as part of `npm run build`, but only actually does
// anything when VERCEL_ENV is "production" or "preview" — each against
// that environment's own database (see AGENTS.md: Database
// environments). Local/non-Vercel builds skip by default. Pass --force to
// run anyway (e.g. to apply migrations locally, or outside Vercel
// entirely) against whatever POSTGRES_URL_NON_POOLING/POSTGRES_URL is
// currently set.
//
// TEMPORARY: while tracking down a SELF_SIGNED_CERT_IN_CHAIN failure
// specific to Production's build container, this tries several candidate
// connections non-fatally and logs which ones work, then proceeds using
// whichever succeeded. Remove this multi-candidate logic (back to a
// single connectionString/sslConfig) once the real fix is confirmed.
//
// See migrations/README.md and AGENTS.md for the rules new migrations
// must follow (additive-only).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const AUTO_RUN_ENVIRONMENTS = ['production', 'preview'];

async function tryConnect(label, connectionString, sslConfig, envOverrides) {
  if (!connectionString) {
    console.log(`[diagnostic] ${label}: SKIPPED (no connection string available)`);
    return null;
  }

  let hostInfo = '<unparseable>';
  try {
    const parsed = new URL(connectionString);
    hostInfo = `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    // leave as <unparseable> — never fall back to logging the raw string
  }

  const prevEnv = {};
  for (const [key, value] of Object.entries(envOverrides || {})) {
    prevEnv[key] = process.env[key];
    process.env[key] = value;
  }

  const client = new Client({ connectionString, ssl: sslConfig, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log(`[diagnostic] ${label}: SUCCESS (host=${hostInfo} ssl=${JSON.stringify(sslConfig)})`);
    return client;
  } catch (error) {
    console.log(`[diagnostic] ${label}: FAILED (host=${hostInfo} ssl=${JSON.stringify(sslConfig)}) - ${error.code || 'no code'}: ${error.message}`);
    try {
      await client.end();
    } catch {
      // already dead
    }
    return null;
  } finally {
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function findWorkingClient() {
  const rejectFalse = { rejectUnauthorized: false };

  const candidates = [
    { label: 'POSTGRES_URL_NON_POOLING (as configured)', connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl: rejectFalse },
    { label: 'POSTGRES_URL (as configured)', connectionString: process.env.POSTGRES_URL, ssl: rejectFalse },
    { label: 'POSTGRES_PRISMA_URL (as configured)', connectionString: process.env.POSTGRES_PRISMA_URL, ssl: rejectFalse },
    {
      label: 'POSTGRES_URL + NODE_TLS_REJECT_UNAUTHORIZED=0',
      connectionString: process.env.POSTGRES_URL,
      ssl: rejectFalse,
      envOverrides: { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    },
  ];

  if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DATABASE) {
    const directUrl = `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE}`;
    candidates.push({ label: 'constructed direct via POSTGRES_HOST', connectionString: directUrl, ssl: rejectFalse });
    candidates.push({
      label: 'constructed direct via POSTGRES_HOST + NODE_TLS_REJECT_UNAUTHORIZED=0',
      connectionString: directUrl,
      ssl: rejectFalse,
      envOverrides: { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    });
  }

  console.log(`[diagnostic] node=${process.version} VERCEL_ENV=${process.env.VERCEL_ENV} NODE_ENV=${process.env.NODE_ENV}`);

  for (const candidate of candidates) {
    const client = await tryConnect(candidate.label, candidate.connectionString, candidate.ssl, candidate.envOverrides);
    if (client) {
      return client;
    }
  }

  return null;
}

async function main() {
  const forced = process.argv.includes('--force');

  if (!forced && !AUTO_RUN_ENVIRONMENTS.includes(process.env.VERCEL_ENV)) {
    console.log(
      `Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'unset'}, not one of ${AUTO_RUN_ENVIRONMENTS.join('/')}; pass --force to run anyway)`
    );
    return;
  }

  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
    console.log('Skipping migrations: POSTGRES_URL is not set');
    return;
  }

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await findWorkingClient();
  if (!client) {
    throw new Error('All candidate connections failed — see [diagnostic] lines above.');
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed, rolled back: ${error.message}`);
      }
    }

    console.log('Migrations up to date.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration runner failed:', error);
  process.exit(1);
});
