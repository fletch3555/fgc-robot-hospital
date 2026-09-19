# Migrations

`schema.sql` (repo root) is the canonical schema for a **fresh** install — run it
once against a brand-new database, per `DEPLOYMENT.md`.

This directory holds the **incremental** changes needed to bring an
**existing** database up to date, since every table in `schema.sql` uses
`CREATE TABLE IF NOT EXISTS`. Re-running `schema.sql` against a database
that already has these tables does nothing for columns added later — it
silently skips the whole `CREATE TABLE` statement. Incremental changes have
to be applied as their own `ALTER TABLE` statements here instead.

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

`0001_init.sql` is a frozen copy of `schema.sql` as it existed before this
directory was introduced, included so the runner can bootstrap a genuinely
fresh database too. For the already-existing production database it's a
no-op, since its `CREATE TABLE IF NOT EXISTS` statements match what's
already there — but this is exactly what fully provisions a brand-new
Preview database from empty on its first deploy, no manual `schema.sql`
run required.

## Writing a new migration

- Number it one higher than the last (`0003_...sql`).
- Prefer additive changes: new columns nullable or with a `DEFAULT`, new
  values appended to `CHECK` constraints. Avoid `NOT NULL` without a
  backfill in the same file, and avoid removing values a `CHECK` constraint
  already allows — old rows may still use them.
- Also update `schema.sql` itself to match, so a fresh install ends up in
  the same state without needing to replay every migration.
- At the start of each new season, bump the `season` column's `DEFAULT` in
  both a new migration and in `schema.sql`.
