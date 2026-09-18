-- Battery Swap desk: tracks temporary battery exchanges between a team and
-- the hospital's spare-battery pool. Separate from spare_parts (one-directional
-- loan/consumable model) and battery_charging requests (one-directional charge
-- request) because a swap is bidirectional: team's original battery comes IN,
-- a hospital spare goes OUT, and later the swap reverses. No physical
-- asset-tagging — spares are an interchangeable pool; only the swap event
-- per team+device is tracked.

CREATE TABLE IF NOT EXISTS battery_swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('swapped', 'returned')),
    submitted_by UUID NOT NULL REFERENCES users(id), -- Clerk who processed the swap-out
    handled_by UUID REFERENCES users(id), -- Clerk who processed the return
    notes TEXT,
    -- Event year this record belongs to; see migrations/README.md
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battery_swaps_status ON battery_swaps(status);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_country_code ON battery_swaps(country_code);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_season ON battery_swaps(season);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_submitted_by ON battery_swaps(submitted_by);
-- Supports the "does this team+device already have an outstanding swap" lookup
CREATE INDEX IF NOT EXISTS idx_battery_swaps_outstanding_lookup
  ON battery_swaps(country_code, device_type, status);

CREATE TRIGGER update_battery_swaps_updated_at
    BEFORE UPDATE ON battery_swaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Grant the new permissions to existing roles (see AGENTS.md: additive-only).
INSERT INTO role_permissions (role, permission_name) VALUES
('intake_clerk', 'battery_swaps.view'),
('intake_clerk', 'battery_swaps.create'),
('intake_clerk', 'battery_swaps.edit'),
('intake_clerk', 'battery_swaps.return'),
('admin', 'battery_swaps.view'),
('admin', 'battery_swaps.create'),
('admin', 'battery_swaps.edit'),
('admin', 'battery_swaps.return')
ON CONFLICT DO NOTHING;
