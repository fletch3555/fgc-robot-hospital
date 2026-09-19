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
// See migrations/README.md and AGENTS.md for the rules new migrations
// must follow (additive-only).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const AUTO_RUN_ENVIRONMENTS = ['production', 'preview'];

async function main() {
  const forced = process.argv.includes('--force');

  if (!forced && !AUTO_RUN_ENVIRONMENTS.includes(process.env.VERCEL_ENV)) {
    console.log(
      `Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'unset'}, not one of ${AUTO_RUN_ENVIRONMENTS.join('/')}; pass --force to run anyway)`
    );
    return;
  }

  // Prefer the direct (non-pooled) connection for migrations: this is a
  // single one-shot admin connection with no concurrency needs, and
  // Supabase's transaction-mode pooler (used by POSTGRES_URL on at least
  // one environment) has been observed to fail from Vercel's build
  // container with SELF_SIGNED_CERT_IN_CHAIN even with rejectUnauthorized
  // false, despite the identical pooled connection working fine at
  // runtime. POSTGRES_URL_NON_POOLING isn't set in every environment
  // (e.g. Preview, set up manually — see AGENTS.md), hence the fallback.
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.log('Skipping migrations: POSTGRES_URL is not set');
    return;
  }

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const sslConfig = AUTO_RUN_ENVIRONMENTS.includes(process.env.VERCEL_ENV) ? { rejectUnauthorized: false } : false;
  let hostInfo = '<unparseable>';
  try {
    const parsed = new URL(connectionString);
    hostInfo = `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    // leave as <unparseable> — never fall back to logging the raw string
  }
  console.log(
    `[diagnostic] node=${process.version} VERCEL_ENV=${process.env.VERCEL_ENV} NODE_ENV=${process.env.NODE_ENV} ssl=${JSON.stringify(sslConfig)} host=${hostInfo}`
  );

  const client = new Client({
    connectionString,
    ssl: sslConfig,
  });

  await client.connect();

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
