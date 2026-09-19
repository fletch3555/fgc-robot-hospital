#!/usr/bin/env node
// Applies any not-yet-applied migrations/*.sql files to POSTGRES_URL, in
// order, tracking what's been applied in a schema_migrations table.
//
// Runs automatically as part of `npm run build`, but only actually does
// anything when VERCEL_ENV is "production" or "preview" — each against
// that environment's own POSTGRES_URL (see AGENTS.md: Database
// environments). Local/non-Vercel builds skip by default. Pass --force to
// run anyway (e.g. to apply migrations locally, or outside Vercel
// entirely) against whatever POSTGRES_URL is currently set.
//
// See migrations/README.md and AGENTS.md for the rules new migrations
// must follow (additive-only).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const AUTO_RUN_ENVIRONMENTS = ['production', 'preview'];

// Arbitrary fixed key for a session-level advisory lock, so two
// deployments building at the same time can't both see an empty
// schema_migrations table and race to apply the same (possibly
// non-idempotent, e.g. CREATE TRIGGER) migration file concurrently.
const MIGRATION_LOCK_KEY = 727501;

// Supabase's pooler presents a chain rooted in their own CA rather than a
// publicly-trusted one. `rejectUnauthorized: false` alone was found to
// fail with SELF_SIGNED_CERT_IN_CHAIN specifically from Vercel's build
// container, even though the identical option works from every other
// environment tested. Explicitly trusting Supabase's actual root CA lets
// the chain validate properly instead of bypassing validation. This is
// the public cert every client receives during the TLS handshake, not a
// secret, and is shared by every Supabase project/pooler node, so this
// one file works for Preview and Production alike (see
// src/lib/database.ts, which duplicates it as a string literal since it
// runs inside Next.js's bundled functions instead of reading a file).
const SUPABASE_POOLER_CA = fs.readFileSync(path.join(__dirname, '..', 'certs', 'supabase-pooler-ca.pem'), 'utf8');

async function main() {
  const forced = process.argv.includes('--force');

  if (!forced && !AUTO_RUN_ENVIRONMENTS.includes(process.env.VERCEL_ENV)) {
    console.log(
      `Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'unset'}, not one of ${AUTO_RUN_ENVIRONMENTS.join('/')}; pass --force to run anyway)`
    );
    return;
  }

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.log('Skipping migrations: POSTGRES_URL is not set');
    return;
  }

  const usingRemoteDatabase = AUTO_RUN_ENVIRONMENTS.includes(process.env.VERCEL_ENV);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new Client({
    connectionString,
    ssl: usingRemoteDatabase ? { ca: SUPABASE_POOLER_CA } : false,
  });
  await client.connect();

  try {
    // Blocks until any concurrently-running migration (e.g. a second
    // deploy building at the same time) finishes and releases its lock.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

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
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration runner failed:', error);
  process.exit(1);
});
