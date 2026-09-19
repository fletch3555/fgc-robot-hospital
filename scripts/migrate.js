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
// specific to Production's build container, this only probes several
// candidate connections read-only (SELECT 1, never a migration) and logs
// which ones succeed — it does not apply any migrations. Once the log
// output identifies a working connection, a follow-up change will fix
// the real connectionString/sslConfig below and remove this probing.
//
// See migrations/README.md and AGENTS.md for the rules new migrations
// must follow (additive-only).

const { Client } = require('pg');

const AUTO_RUN_ENVIRONMENTS = ['production', 'preview'];

async function probeConnect(label, connectionString, sslConfig, envOverrides) {
  if (!connectionString) {
    console.log(`[diagnostic] ${label}: SKIPPED (no connection string available)`);
    return;
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
  } catch (error) {
    console.log(`[diagnostic] ${label}: FAILED (host=${hostInfo} ssl=${JSON.stringify(sslConfig)}) - ${error.code || 'no code'}: ${error.message}`);
  } finally {
    try {
      await client.end();
    } catch {
      // already dead
    }
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function runConnectionProbes() {
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

  // Run sequentially (not in parallel) and never let one probe's outcome
  // decide what happens to the database — this only ever reads (SELECT 1)
  // and always continues to every candidate regardless of earlier results.
  for (const candidate of candidates) {
    await probeConnect(candidate.label, candidate.connectionString, candidate.ssl, candidate.envOverrides);
  }
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

  await runConnectionProbes();

  // Diagnostic-only build: intentionally fail after probing so this never
  // proceeds to apply migrations against an unverified connection. See the
  // module comment above.
  throw new Error('Diagnostic probing complete — see [diagnostic] lines above. No migrations were applied.');
}

main().catch((error) => {
  console.error('Migration runner failed:', error);
  process.exit(1);
});
