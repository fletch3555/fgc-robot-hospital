<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project instructions

In practice the warning above has already bitten us: MUI's slotProps
rename, next-auth cookie changes, etc. all showed up as real breakages
during earlier work on this repo — don't assume an API still works the
way training data suggests.

## Commands

- `npm run dev` — local dev server (Turbopack)
- `npm run build` — production build; also runs `scripts/migrate.js` first (see Migrations below)
- `npm run migrate` — run pending DB migrations directly; `-- --force` bypasses the environment gate (see below)
- `npm test`, `npm run test:unit`, `npm run test:integration` — Jest; `:watch` and `:coverage` variants exist for each
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`

## Data model gotcha: kop-inventory.ts is the real inventory source

**`src/data/kop-inventory.ts` is the live source for FGC Kit-of-Parts
inventory** — a hardcoded static array, imported directly by
`src/app/api/fgc-inventory/route.ts` and by the spare-parts create/validate
flow (`src/app/api/spare-parts/route.ts`, `src/app/spare-parts/*`).

The `fgc_inventory` Postgres table, `scripts/import-fgc-inventory.js`, and
the `FGC_2025_KoP.csv`/`FGC_2026_KoP.csv` files look like the real
pipeline but are dead code — `fgc-inventory/route.ts` has an explicit
comment: "This API route is now deprecated in favor of static data."
When updating the Kit of Parts for a new season, edit `kop-inventory.ts`
directly. Re-running the import script or editing the CSV does nothing
the app actually reads.

## Deployment

There is no CI/CD workflow in this repo (no `.github/workflows/`).
Deployment is Vercel's native GitHub App integration: every push
auto-deploys — Preview for branches/PRs, Production for the `main`
branch. `vercel.json` and `DEPLOYMENT.md` cover the rest.

## Database environments — Production and Preview are separate databases

**Production** and **Preview** deployments use two different Supabase
Postgres databases, via Vercel's per-environment `POSTGRES_URL` scoping
(Project Settings → Environment Variables). Local development should
point at the **Preview** database too — never point a local `.env` at
the Production connection string.

The app and `scripts/migrate.js` both read `POSTGRES_URL` directly (see
`src/lib/database.ts`). The Supabase Vercel integration only manages
one project's vars and auto-sets `POSTGRES_URL` for the **Production**
project it's connected to, and Preview's connection string is set manually
using that same name (see `DEPLOYMENT.md`) so both environments read the
same variable.

This wasn't always true: earlier in this project's life, local dev and
every Preview deployment shared the single Production database directly.
If you ever find local dev or a Preview deployment's connection string
resolving to the production database, that's a regression — fix it, don't
treat it as normal.

Setting up or replacing the Preview database is a one-time manual step
(creating a Supabase project, setting the Preview-scoped env var in
Vercel) that needs the user's own login — see `DEPLOYMENT.md`. Once it's
wired up, `scripts/migrate.js` bootstraps its schema automatically on the
first Preview deploy (see Migrations below) — no manual `schema.sql` run
needed against it.

## Database schema changes: additive-only

This project keeps multiple seasons' worth of `requests`/`spare_parts` data
in one database (see `migrations/README.md`). That only stays safe if
schema changes never break rows written under an older schema. Follow
these rules for **any** change to `schema.sql` or a new file under
`migrations/`:

- **Never add a `NOT NULL` column without a `DEFAULT`, or without
  backfilling existing rows in the same migration.** A bare `ALTER TABLE ...
  ADD COLUMN x NOT NULL` fails outright against a populated table.
- **Never narrow a `CHECK` constraint** (e.g. removing a value from
  `status IN (...)`) if any existing row could hold that value. Only add
  values, never remove them, even after the UI stops offering them.
- **Never rename or drop a column/table that's read anywhere in the
  codebase** (`src/models/*.ts`, raw `query()` calls in `src/app/api/**`)
  without grepping for every reference first and updating them in the same
  change.
- **Don't rely on re-running `schema.sql` to update an existing database.**
  Every table uses `CREATE TABLE IF NOT EXISTS`, so re-running it against a
  database that already has the table is a no-op — it will NOT apply a
  newly added column. Incremental changes to an existing database go in
  `migrations/000N_*.sql` as explicit `ALTER TABLE` statements. See
  `migrations/README.md` for the numbering/writing convention.
- **Update `schema.sql` in the same change** as any new migration, so a
  fresh install ends up in the same state without replaying every
  migration by hand.
- **Prefer nullable/optional new columns** over required ones unless the
  value is truly always knowable at insert time.

### Migrations apply automatically on Production and Preview deploys — be extra careful

`scripts/migrate.js` runs as part of `npm run build`, which Vercel invokes
for every deployment. It applies pending migrations whenever
`VERCEL_ENV` is `production` or `preview` — each against that
environment's own `POSTGRES_URL`, tracked in a `schema_migrations` table
so a given migration only runs once per database. Local/non-Vercel builds
skip it by default. **This means merging a new file under `migrations/`
to a branch that gets a Preview deployment (or to `main`) applies it to
that environment's real database on the next deploy — there is no
separate manual approval step.**

Because of that, treat adding a migration file itself as the point where
database caution applies, not a separate "should I run this" step
afterward:

- Double-check additive-only correctness (see rules above) before the
  migration file is pushed anywhere it'll get built — there's no review
  gate after that point.
- Don't add a migration file to a change that's still being iterated on;
  land it once the schema change is final.
- If you want to test a migration without pushing at all, use
  `node scripts/migrate.js --force` against a database you specify via
  `POSTGRES_URL` in your shell — never pass `--force` with `POSTGRES_URL`
  set to the Production connection string without the user's explicit
  confirmation, since that bypasses every safeguard above at once.

## Season scoping

`src/lib/season.ts` (`getCurrentSeason()`, from the `EVENT_SEASON` env var)
is the single source of truth for "current season." New `requests`/
`spare_parts` rows are tagged with it on insert. `Request.findAll` /
`findRecentlyClosed` / `findByUser` and `SparePart.findAll` / `findByUser`
default to filtering by it, with an explicit `season: 'all'` override —
keep that default when adding new read paths for these tables, and thread
an `allSeasons`-style query param through if the route needs to expose the
override (see `src/app/api/requests/route.ts` for the pattern).

At the start of each new season: bump `EVENT_SEASON` in the environment,
and bump the `season` column's `DEFAULT` in both `schema.sql` and a new
migration.
