-- Lets accounts that can no longer meaningfully be used (e.g. the legacy
-- Slack-era accounts backfilled with dummy, credential-less auth.users
-- rows in migration 0003) be hidden from /admin/users by default, without
-- deleting them or losing the historical requests/spare_parts/battery_swaps
-- records that still reference them.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Archive the dummy legacy accounts from migration 0003. They're
-- identifiable as the only auth.users rows with no email set — every real
-- account (including the very first bootstrap admin) always gets a real
-- email via Supabase's Admin API, so this only matches the dummy rows.
UPDATE users SET is_archived = true
WHERE id IN (SELECT id FROM auth.users WHERE email IS NULL);
