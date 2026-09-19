#!/usr/bin/env node
// TEMPORARY, read-only diagnostic: dumps the live schema of whatever
// database POSTGRES_URL points to (tables, columns, indexes, triggers,
// foreign keys, role_permissions/archive data, and schema_migrations
// contents) so we can reconcile Production's actual pre-existing schema
// against migrations/0001-0007 before letting migrate.js touch it for
// real. Never writes anything. Always exits non-zero afterward so this
// can never be mistaken for a real deploy.
//
// This dump is not, by itself, sufficient proof that a given migration
// file is fully applied — it doesn't diff exact index definitions or
// role_permissions rows against each migration's SQL. Treat it as a
// starting point for reconciliation, not the final word.
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

    // pg_indexes (not information_schema, which has no index view) so
    // migrations that only add an index (0002/0004/0005) are visible.
    const indexes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    console.log('[schema] indexes:', indexes.rows.map((r) => `${r.tablename}.${r.indexname}`).join(', ') || '(none)');

    const triggers = await client.query(`
      SELECT event_object_table AS table_name, trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    console.log('[schema] triggers:', triggers.rows.map((r) => `${r.table_name}.${r.trigger_name}`).join(', ') || '(none)');

    // Foreign keys via pg_constraint/pg_class/pg_namespace directly,
    // keyed by OID rather than constraint_name (which is only unique
    // per-table, not database-wide) and DISTINCT per constraint so a
    // composite-column FK isn't emitted once per column.
    const fks = await client.query(`
      SELECT DISTINCT
        conname AS constraint_name,
        conrelid::regclass::text AS table_name,
        confrelid::regclass::text AS foreign_table
      FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
      ORDER BY table_name, constraint_name
    `);
    console.log(
      '[schema] foreign keys:',
      fks.rows.map((r) => `${r.table_name}.${r.constraint_name} -> ${r.foreign_table}`).join(', ') || '(none)'
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

    // 0007's backfill sets is_archived=true for legacy (email IS NULL in
    // auth.users) accounts — check whether that ever ran, not just
    // whether the column exists.
    const archivedCount = await client
      .query('SELECT COUNT(*)::int AS count FROM users WHERE is_archived = true')
      .catch((e) => ({ rows: [{ count: `error: ${e.message}` }] }));
    console.log('[schema] users.is_archived=true count:', archivedCount.rows[0].count);

    // 0004/0006's role_permissions INSERTs — list what's actually there
    // for the battery_swaps.* permissions specifically, since table
    // existence alone doesn't prove the data-only INSERT statements ran.
    const batterySwapPerms = await client
      .query(`SELECT role, permission_name FROM role_permissions WHERE permission_name LIKE 'battery_swaps.%' ORDER BY role, permission_name`)
      .catch((e) => ({ rows: [{ role: `error: ${e.message}`, permission_name: '' }] }));
    console.log(
      '[schema] battery_swaps.* role_permissions rows:',
      batterySwapPerms.rows.map((r) => `${r.role}:${r.permission_name}`).join(', ') || '(none)'
    );

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
  .then(() => {
    console.log('[schema] Introspection complete. Intentionally failing so nothing deploys.');
    // Set the exit code and let Node drain stdout/stderr naturally on its
    // own event-loop exit, rather than calling process.exit() right after
    // logging — Vercel captures build output through a pipe, and an
    // immediate process.exit() can terminate before those writes flush.
    process.exitCode = 1;
  });
