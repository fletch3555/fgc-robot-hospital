-- Merge battery_swaps into requests/battery_charging, so one intake form
-- and one table cover both charging and loaner-swap workflows. See
-- AGENTS.md and migrations/README.md for the additive-only rules this
-- follows; battery_swaps itself is deliberately left in place (unused)
-- rather than dropped, since this migration runs automatically on the
-- next Preview/Production deploy and Production's existing data can't be
-- verified from here first. A later, separate, explicitly-approved
-- migration should drop it once the merged data has been verified live.

-- 1. requests.handled_by records who processed a battery_charging
--    request's return, mirroring battery_swaps.handled_by and
--    spare_parts.handled_by. Kept separate from assigned_to, which
--    already means "who's working this ticket" for all 4 request types.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_requests_handled_by ON requests(handled_by);

-- 2. The loaner pool is a shared resource config, not a per-request
--    field, so it stays its own table -- just renamed to match the
--    surviving feature name. Pure metadata change, no data movement.
--    Guarded rather than a bare RENAME: DEPLOYMENT.md's documented
--    from-scratch bootstrap runs schema.sql once against a brand-new
--    Production database, and schema.sql already creates
--    battery_charging_pool directly (it reflects the post-merge end
--    state) -- an unconditional rename would then fail with "relation
--    battery_charging_pool already exists" the first time this file
--    runs there. Already-migrated databases (which created
--    battery_swap_pool via migration 0005 first) are unaffected -- this
--    only changes behavior for a not-yet-existing database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'battery_swap_pool')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'battery_charging_pool') THEN
    ALTER TABLE battery_swap_pool RENAME TO battery_charging_pool;
  END IF;
END $$;

-- 3. Defensive vocabulary fix: battery_charging_data.batteryType used to
--    allow 'robot_battery', which never matched battery_swaps.device_type's
--    'robot_controller' -- align on the latter before migrating any data.
UPDATE requests
SET battery_charging_data = jsonb_set(battery_charging_data, '{batteryType}', '"robot_controller"')
WHERE type = 'battery_charging' AND battery_charging_data ->> 'batteryType' = 'robot_battery';

-- 4. Migrate existing battery_swaps rows into requests. Reuses the same
--    id (safe -- separate tables, no FK collision) so any external
--    reference to an old battery_swaps id still resolves to the
--    equivalent requests row. status: 'swapped' -> 'open' (outstanding),
--    'returned' -> 'completed', matching how requests.status is already
--    used elsewhere (open/in-progress = active, completed = done).
INSERT INTO requests (
  id, country_code, comments, type, status, submitted_by, handled_by,
  battery_charging_data, season, created_at, updated_at
)
SELECT
  bs.id, bs.country_code, bs.notes, 'battery_charging',
  CASE bs.status WHEN 'swapped' THEN 'open' WHEN 'returned' THEN 'completed' END,
  bs.submitted_by, bs.handled_by,
  jsonb_build_object('batteryType', bs.device_type, 'loanerProvided', bs.loaner_provided),
  bs.season, bs.created_at, bs.updated_at
FROM battery_swaps bs
WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.id = bs.id);

-- 5. battery_charging.* permissions were defined in code but never
--    seeded to any role in a committed migration -- this is the first
--    time they're actually granted. Two new permission strings (.return,
--    .configure) mirror battery_swaps' verbs for the return workflow and
--    loaner-pool configuration. Mirrors exactly which roles hold the
--    equivalent battery_swaps.* grants today.
INSERT INTO role_permissions (role, permission_name) VALUES
('intake_clerk', 'battery_charging.view'),
('intake_clerk', 'battery_charging.create'),
('intake_clerk', 'battery_charging.edit'),
('intake_clerk', 'battery_charging.return'),
('admin', 'battery_charging.view'),
('admin', 'battery_charging.create'),
('admin', 'battery_charging.edit'),
('admin', 'battery_charging.return'),
('admin', 'battery_charging.configure')
ON CONFLICT DO NOTHING;

-- battery_swaps' table and its battery_swaps.* role_permissions rows are
-- deliberately left in place, inert -- see the header comment above.
