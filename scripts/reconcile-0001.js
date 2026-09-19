#!/usr/bin/env node
// ONE-TIME reconciliation for Production: its database predates the
// migration system and already has exactly the schema
// migrations/0001_init.sql would create (verified by direct schema
// introspection — see PR #13), so mark it applied without ever running
// its SQL. Safe to run against any environment: the INSERT is
// idempotent (ON CONFLICT DO NOTHING), so it's a no-op anywhere
// 0001_init.sql is already tracked (e.g. Preview).
//
// Also logs (non-fatally) whether an existing users row matches the
// admin email, so we know whether to reactivate that row's id when
// setting up real Supabase Auth credentials after migrations 0002-0007
// run for real, rather than creating a disconnected new account.
//
// Delete this file once this reconciliation has run successfully
// against Production.

const { Client } = require('pg');

const ADMIN_EMAIL = 'eric@thefletcher.net';

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

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await client
      .query(
        `SELECT u.id, u.name, u.created_at,
                COALESCE(array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) AS roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.email = $1
         GROUP BY u.id`,
        [ADMIN_EMAIL]
      )
      .catch((e) => ({ rows: [], error: e.message }));

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      console.log(`[reconcile] found existing users row for ${ADMIN_EMAIL}: id=${row.id} name=${row.name} created_at=${row.created_at} roles=${row.roles.join(',')}`);
    } else {
      console.log(`[reconcile] no existing users row for ${ADMIN_EMAIL}${existing.error ? ` (query error: ${existing.error})` : ''}`);
    }

    const result = await client.query(
      `INSERT INTO schema_migrations (filename) VALUES ('0001_init.sql') ON CONFLICT (filename) DO NOTHING RETURNING filename`
    );
    console.log(
      result.rowCount > 0
        ? '[reconcile] marked 0001_init.sql as applied (schema verified identical via PR #13 introspection)'
        : '[reconcile] 0001_init.sql was already marked applied — no-op'
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[reconcile] failed:', error);
  process.exitCode = 1;
});
