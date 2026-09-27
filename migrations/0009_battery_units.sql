-- Track individual numbered loaner batteries instead of a bare count, so a
-- specific physical unit can be checked out/returned, double-checkout of
-- the same unit is impossible, and admins can retire/add a specific unit
-- rather than only bump a total.
--
-- Superseding battery_charging_pool, which is left inert -- same "never
-- drop, just supersede" treatment as battery_swaps in migration 0008.

CREATE TABLE IF NOT EXISTS battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    number INTEGER NOT NULL CHECK (number > 0),
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (device_type, number, season)
);
CREATE INDEX IF NOT EXISTS idx_battery_units_season ON battery_units(season);

-- Seed from whatever battery_charging_pool.total_count already holds today,
-- so the transition doesn't silently reset the pool to empty.
INSERT INTO battery_units (device_type, number, season)
SELECT p.device_type, gs.n, p.season
FROM battery_charging_pool p, generate_series(1, p.total_count) AS gs(n)
ON CONFLICT DO NOTHING;
