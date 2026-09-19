#!/usr/bin/env node
// TEMPORARY, read-only diagnostic: dumps the live schema of whatever
// database POSTGRES_URL points to (tables, columns, triggers, foreign
// keys, and schema_migrations contents) so we can reconcile Production's
// actual pre-existing schema against migrations/0001-0007 before letting
// migrate.js touch it for real. Never writes anything. Always exits
// non-zero afterward so this can never be mistaken for a real deploy.
//
// Delete this file (and the temporary build script override) once the
// reconciliation plan is in place.

const { Client } = require('pg');

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.log('POSTGRES_URL is not set');
    return;
  }

  const usingRemoteDatabase = ['production', 'preview'].includes(process.env.VERCEL_ENV);
  const previousValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (usingRemoteDatabase) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const client = new Client({
    connectionString,
    ssl: usingRemoteDatabase ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
  } finally {
    if (previousValue === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousValue;
  }

  console.log(`[schema] VERCEL_ENV=${process.env.VERCEL_ENV}`);

  try {
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('[schema] public tables:', tables.rows.map((r) => r.table_name).join(', ') || '(none)');

    const columns = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const byTable = {};
    for (const row of columns.rows) {
      (byTable[row.table_name] ||= []).push(
        `${row.column_name} ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}${row.column_default ? ` DEFAULT ${row.column_default}` : ''}`
      );
    }
    for (const [table, cols] of Object.entries(byTable)) {
      console.log(`[schema] columns(${table}):`, cols.join(' | '));
    }

    const triggers = await client.query(`
      SELECT event_object_table AS table_name, trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    console.log('[schema] triggers:', triggers.rows.map((r) => `${r.table_name}.${r.trigger_name}`).join(', ') || '(none)');

    const fks = await client.query(`
      SELECT tc.table_name, tc.constraint_name, ccu.table_schema AS foreign_schema, ccu.table_name AS foreign_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
    console.log(
      '[schema] foreign keys:',
      fks.rows.map((r) => `${r.table_name}.${r.constraint_name} -> ${r.foreign_schema}.${r.foreign_table}`).join(', ') || '(none)'
    );

    const authUsersExists = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') AS exists
    `);
    console.log('[schema] auth.users exists:', authUsersExists.rows[0].exists);

    if (authUsersExists.rows[0].exists) {
      const authUserCount = await client.query('SELECT COUNT(*)::int AS count FROM auth.users');
      console.log('[schema] auth.users row count:', authUserCount.rows[0].count);
    }

    const publicUserCount = await client.query('SELECT COUNT(*)::int AS count FROM users').catch((e) => ({ rows: [{ count: `error: ${e.message}` }] }));
    console.log('[schema] public.users row count:', publicUserCount.rows[0].count);

    const migrationsTableExists = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') AS exists
    `);
    console.log('[schema] schema_migrations exists:', migrationsTableExists.rows[0].exists);
    if (migrationsTableExists.rows[0].exists) {
      const applied = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
      console.log('[schema] schema_migrations rows:', applied.rows.map((r) => r.filename).join(', ') || '(empty)');
    }
  } finally {
    await client.end();
  }
}

main()
  .catch((error) => {
    console.error('[schema] introspection error:', error);
  })
  .finally(() => {
    // Always fail — this build must never actually deploy.
    console.log('[schema] Introspection complete. Intentionally failing so nothing deploys.');
    process.exit(1);
  });
