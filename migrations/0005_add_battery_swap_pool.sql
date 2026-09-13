-- Tracks the fixed number of loaner batteries available per device type,
-- so the app can compute "available" as total minus currently outstanding
-- swaps. Season-scoped like everything else — the physical pool size can
-- differ year to year.

CREATE TABLE IF NOT EXISTS battery_swap_pool (
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    season INTEGER NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (device_type, season)
);
