-- Move credential storage to Supabase Auth.
--
-- Password verification moves entirely to Supabase Auth; this app's own
-- `users` table stops storing credentials, and every users.id must equal
-- the id Supabase Auth assigned that account (enforced by the FK below).
-- No real user rows exist yet (this auth system has never been deployed),
-- so there's no data to migrate or backfill here — structural change only.

ALTER TABLE users DROP COLUMN IF EXISTS password;

ALTER TABLE users
  ADD CONSTRAINT users_id_fkey_auth_users
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
