-- Two additive changes to the Battery Swap desk:
--
-- 1. battery_swaps.loaner_provided distinguishes a plain drop-off-for-
--    charging (no spare handed out) from an actual loaner exchange.
--    Defaults true so every existing row keeps its current meaning.
--    getPoolStatus()'s outstanding count must only count rows where this
--    is true, otherwise charge-only drop-offs would wrongly reduce loaner
--    availability.
-- 2. battery_swaps.configure is a new, admin-only permission for editing
--    the loaner pool's total count, split out from battery_swaps.edit
--    (which stays granted more widely, for correcting individual swap
--    records).

ALTER TABLE battery_swaps ADD COLUMN IF NOT EXISTS loaner_provided BOOLEAN NOT NULL DEFAULT true;

INSERT INTO role_permissions (role, permission_name) VALUES
('admin', 'battery_swaps.configure')
ON CONFLICT DO NOTHING;
