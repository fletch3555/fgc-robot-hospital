-- Move credential storage to Supabase Auth.
--
-- Password verification moves entirely to Supabase Auth; this app's own
-- `users` table stops storing credentials, and every users.id must equal
-- the id Supabase Auth assigned that account (enforced by the FK below).
--
-- Preview never had real rows under the old Slack OAuth system, but
-- Production does, with ids that predate Supabase Auth entirely. Since
-- those accounts' ability to log in isn't being preserved (Slack OAuth is
-- being removed outright), backfill a bare, credential-less auth.users
-- row per existing id instead of migrating real identities. No email/
-- password/identity provider is set, so these rows can never actually
-- authenticate — they exist purely so the FK below doesn't reject
-- existing rows. This also means every other table that references
-- users.id (requests, spare_parts, user_roles, battery_swaps, ...) needs
-- no changes at all, since the id itself never moves.
ALTER TABLE users DROP COLUMN IF EXISTS password;

INSERT INTO auth.users (id, created_at, updated_at, aud, role)
SELECT id, NOW(), NOW(), 'authenticated', 'authenticated'
FROM users
WHERE id NOT IN (SELECT id FROM auth.users);

ALTER TABLE users
  ADD CONSTRAINT users_id_fkey_auth_users
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
