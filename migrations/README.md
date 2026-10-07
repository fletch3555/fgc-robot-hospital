# Migrations

This directory is the single source of truth for schema — there's no separate
`schema.sql`. `scripts/migrate.js` applies every file here, in order, to reach the
same end state whether bootstrapping a brand-new database or bringing an existing
one up to date.

That still means **incremental** changes to an **existing** database need their own
file here: every table's `CREATE TABLE IF NOT EXISTS` (in `0001_init.sql` or any
later file) is a no-op against a database that already has that table, so editing
an existing `CREATE TABLE` to add a column does nothing for a database that already
ran it. New columns on existing tables ship as their own `ALTER TABLE` statement in
a new file instead.

## Applying

**Production and Preview deploys apply pending migrations automatically,
each against their own database** (see AGENTS.md: Database environments).
`scripts/migrate.js` runs as part of `npm run build`, which Vercel invokes
for every deployment — but the script only does anything when
`VERCEL_ENV` is `production` or `preview`. Any build run outside Vercel
(including local `npm run build`) skips it by default. It tracks what's
already been applied in a `schema_migrations` table per database, so
re-running it only applies files that database hasn't seen yet.

To run it yourself — locally against a database, or to apply a migration
without waiting for a deploy — pass `--force`:

```bash
npm run migrate -- --force
# or directly:
node scripts/migrate.js --force
```

`--force` runs against whatever `POSTGRES_URL` is currently set to, so
double-check it before using this against a database you didn't mean to
touch.

`0001_init.sql` is the original full schema (tables, indexes, and seed data) from
before this directory existed. For the already-existing production database it's a
no-op, since its `CREATE TABLE IF NOT EXISTS` statements match what's already there
— but this is exactly what fully provisions a brand-new database (Preview or
Production) from empty on its first deploy, no manual schema-creation step needed
for either environment.

## Writing a new migration

- Number it one higher than the last (`0003_...sql`).
- Prefer additive changes: new columns nullable or with a `DEFAULT`, new
  values appended to `CHECK` constraints. Avoid `NOT NULL` without a
  backfill in the same file, and avoid removing values a `CHECK` constraint
  already allows — old rows may still use them.
- At the start of each new season, bump the `season` column's `DEFAULT` in
  a new migration.
