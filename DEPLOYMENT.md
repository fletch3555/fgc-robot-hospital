# Vercel Deployment Guide

## Prerequisites

1. **Database Setup**: Two PostgreSQL databases accessible from the internet (e.g., Supabase, Neon, AWS RDS) — one for Production, one for Preview. Keep them separate; see "Setting up the Preview database" below.

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project" and import your GitHub repository
3. Select "Next.js" as the framework preset

### 2. Environment Variables

**Production** is managed by the Supabase Vercel integration (Vercel dashboard > Integrations
> Supabase), connected to the Production Supabase project. It auto-sets, scoped to
Production only: `SUPABASE_URL`, `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`. The app reads `POSTGRES_URL` directly (see
`src/lib/database.ts`), so no other database env var is needed for Production. One var
the integration can't provide still needs adding manually, scoped to Production:
`NEXT_PUBLIC_SUPABASE_URL` (copy the value from `SUPABASE_URL`) — Next.js only inlines env
vars into the browser bundle when the name is literally prefixed `NEXT_PUBLIC_`, which no
integration can satisfy for you. Also add, scoped to all environments: `EVENT_SEASON`.

The Supabase integration only connects to one project, so **Preview** (see below) gets all
of its vars set by hand, scoped to Preview (and Development, for local `.env`), using the
same `POSTGRES_URL` name so both environments read the same variable:

```
POSTGRES_URL=postgresql://username:password@host:port/database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Auth and RLS entirely — it's used only by admin-facing
server routes (creating/updating/deleting user accounts) and must never be exposed to the
browser. Find all four Preview values in the Preview Supabase project's dashboard:
Settings > Database (connection string) and Settings > API (URL, anon key, service role key).

### 3. Setting up the Preview database

Production and Preview must be two separate databases — see `AGENTS.md` ("Database
environments") for why. Requires manual setup, once:

1. Create a second Supabase project (Production and Preview must be genuinely separate
   projects, not just separate databases, since Auth is bundled per-project, and the Vercel
   integration only connects to one project at a time). Note its Postgres connection string
   and its Settings > API values (URL, anon key, service role key).
2. In Vercel: Project Settings > Environment Variables > add entries scoped to **Preview**
   (and **Development**, so local dev uses it too) for `POSTGRES_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`, all pointing at the new project. Leave the existing
   **Production**-scoped entries (integration-managed, plus the manually-added
   `NEXT_PUBLIC_SUPABASE_URL`) pointing at the original project.
3. Update your local `.env` to the same Preview project's values, so local development
   stops touching production data and Auth users.
4. Don't run `schema.sql` against the new database by hand — the next Preview deployment's
   build automatically provisions its schema from scratch (see `migrations/README.md`).
5. Bootstrap the first admin account for the new project (see "First admin account" below)
   — a brand-new Supabase project has no users at all yet.

### 4. Database Schema (Production, first time only)
For a brand-new Production database, run `schema.sql` against it once to create the
initial tables.

After that, schema changes ship as files under `migrations/` and apply automatically on
every Production and Preview deploy, each against its own database — see
`migrations/README.md`. There's no manual step needed beyond the initial `schema.sql` run
against Production.

### 5. Deploy
1. Click "Deploy" in Vercel
2. Vercel will automatically build and deploy your application

## Post-Deployment

### 1. First admin account

There's no self-registration — accounts are always admin-provisioned (see `AGENTS.md`).
That means a fresh Supabase project (Production or Preview) starts with zero users, so
nobody can sign in to `/admin/users` to create the first one. Bootstrap it once:

1. In the Supabase dashboard for that project: Authentication > Users > Add user, create
   an account with an email/password.
2. Insert a matching row into that project's `users` table with the same id (find it on the
   user you just created) — `id`, `email`, `name`.
3. Sign in to the app with that email/password.
4. Call `POST /api/admin/promote` while signed in (e.g. from the browser console:
   `fetch('/api/admin/promote', { method: 'POST' })`) to grant yourself the `admin` role.
5. From then on, use `/admin/users` in the app to create every other account.

### 2. Test Authentication
1. Visit your deployed app
2. Test the login flow
3. Verify database connections are working

## Troubleshooting

### Build Errors
- Check the build logs in Vercel dashboard
- Ensure all environment variables are set correctly
- Verify TypeScript compilation with `npm run build` locally

### Database Connection Issues
- Verify `POSTGRES_URL` is correct for that environment
- Ensure your database allows connections from Vercel's IP ranges
- Check SSL settings (production databases usually require SSL)

### Authentication Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match the same
  Supabase project as `POSTGRES_URL` for that environment
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set — admin user creation/deletion fails without it
- Confirm you're not accidentally using Production's Supabase values in Preview or local dev

## Performance Optimization

The app is configured for serverless deployment with:
- Single database connections per function call
- Optimized webpack configuration
- Static file caching headers
- Maximum function duration of 30 seconds

## Monitoring

Use Vercel's built-in analytics and logs to monitor:
- Function performance
- Error rates
- Build times
- Database connection health