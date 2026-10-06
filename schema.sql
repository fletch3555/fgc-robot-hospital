-- Robot Hospital Complete Database Schema
-- This file contains the complete database schema including RBAC system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles table first (needed for foreign key references)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
-- robot_inspector/lead_robot_inspector were removed (see the commented-out
-- Role union members in src/lib/auth-types.ts) and don't exist in the
-- current roles table -- don't reintroduce them here.
INSERT INTO roles (id, name, description) VALUES
('guest', 'Guest', 'Read-only access to basic information'),
('intake_clerk', 'Intake Clerk', 'Can create and view requests'),
('machine_shop_operator', 'Machine Shop Operator', 'Can handle machine shop requests'),
('spare_parts_attendant', 'Spare Parts Attendant', 'Can manage spare parts requests'),
('flying_squad_software', 'Flying Squad - Software', 'Can handle software support requests'),
('flying_squad_hardware', 'Flying Squad - Hardware', 'Can handle hardware support requests'),
('admin', 'Administrator', 'Full system access')
ON CONFLICT (id) DO NOTHING;

-- Users table (no single role column - uses many-to-many relationship)
-- id must be an existing auth.users(id) — created via Supabase Auth
-- (supabase.auth.admin.createUser), never generated locally.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- Hides an account from /admin/users by default without deleting it
    -- (e.g. accounts with no working login left).
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Roles junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Support Requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) NOT NULL,
    comments TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('hardware', 'software', 'machine_shop', 'battery_charging')),
    -- priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
    submitted_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    -- Who processed a battery_charging request's return (mirrors
    -- spare_parts.handled_by); unused by the other three request types.
    handled_by UUID REFERENCES users(id),
    -- Type-specific data stored as JSON
    hardware_data JSONB,
    software_data JSONB,
    machine_shop_data JSONB,
    battery_charging_data JSONB,
    -- Event year this request belongs to; see migrations/README.md
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spare Parts table
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    fgc_part_number VARCHAR(255), -- Reference to FGC inventory part number
    quantity INTEGER NOT NULL,
    is_loan BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL CHECK (status IN ('issued', 'returned')),
    submitted_by UUID NOT NULL REFERENCES users(id), -- Attendant who issued the part
    handled_by UUID REFERENCES users(id), -- Attendant who handled return (if applicable)
    notes TEXT[],
    -- Event year this record belongs to; see migrations/README.md
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battery Swaps table (bidirectional exchange: team's low battery in,
-- a hospital spare out, until the swap is reversed)
CREATE TABLE IF NOT EXISTS battery_swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('swapped', 'returned')),
    submitted_by UUID NOT NULL REFERENCES users(id), -- Clerk who processed the swap-out
    handled_by UUID REFERENCES users(id), -- Clerk who processed the return
    notes TEXT,
    -- False for a plain drop-off-for-charging with no spare handed out;
    -- these don't count against the loaner pool's outstanding total.
    loaner_provided BOOLEAN NOT NULL DEFAULT true,
    -- Event year this record belongs to; see migrations/README.md
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- battery_swaps itself is superseded by the battery_charging request type
-- (see migrations/0008_merge_battery_swaps_into_requests.sql) and is left
-- here, inert, only because migrations/0004_add_battery_swaps.sql always
-- creates it when bootstrapping a fresh database from the migrations
-- directory -- schema.sql has to stay consistent with that end state
-- rather than pretending the table never existed.

-- battery_charging_pool tracked only a bare total_count per device type; it
-- is superseded by battery_units (migrations/0009_battery_units.sql), which
-- tracks individual numbered physical batteries instead. Left here, inert,
-- for the same reason battery_swaps is above -- migrations/0005 always
-- creates it when bootstrapping from the migrations directory.
CREATE TABLE IF NOT EXISTS battery_charging_pool (
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    season INTEGER NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (device_type, season)
);

-- Individual numbered loaner batteries (e.g. "Robot Controller #7"), so a
-- specific physical unit can be checked out/returned rather than just
-- decrementing a count. No status column -- a unit is "checked out" if any
-- open/in-progress battery_charging request references its device_type +
-- number in battery_charging_data (see src/lib/batteryPool.ts).
CREATE TABLE IF NOT EXISTS battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('robot_controller', 'driver_hub')),
    number INTEGER NOT NULL CHECK (number > 0),
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (device_type, number, season)
);

-- Teams table (now using countries data, but keeping for potential future use)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(255) NOT NULL,
    at_event BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_name)
);

-- Insert default role permissions
-- These blocks mirror live Production's role_permissions as of 2026-10-06
-- (dumped via introspection, not the original hand-written baseline --
-- /admin/roles has been used to broaden every non-admin role well beyond
-- what this file originally seeded, so a fresh install should start from
-- that same broadened state rather than the stale narrower one).
-- Guest (default) - documentation + reference pages only
INSERT INTO role_permissions (role, permission_name) VALUES
('guest', 'documentation.view'),
('guest', 'inventory.view'),
('guest', 'matches.view'),
('guest', 'teams.view')
ON CONFLICT DO NOTHING;

-- Intake Clerk - can create and manage initial requests
INSERT INTO role_permissions (role, permission_name) VALUES
('intake_clerk', 'battery_charging.assignee'),
('intake_clerk', 'battery_charging.create'),
('intake_clerk', 'battery_charging.edit'),
('intake_clerk', 'battery_charging.return'),
('intake_clerk', 'battery_charging.view'),
('intake_clerk', 'battery_swaps.create'),
('intake_clerk', 'battery_swaps.edit'),
('intake_clerk', 'battery_swaps.return'),
('intake_clerk', 'battery_swaps.view'),
('intake_clerk', 'documentation.view'),
('intake_clerk', 'hardware.create'),
('intake_clerk', 'hardware.edit'),
('intake_clerk', 'hardware.view'),
('intake_clerk', 'inventory.view'),
('intake_clerk', 'machine_shop.create'),
('intake_clerk', 'machine_shop.edit'),
('intake_clerk', 'machine_shop.view'),
('intake_clerk', 'matches.view'),
('intake_clerk', 'requests.assign'),
('intake_clerk', 'requests.create'),
('intake_clerk', 'requests.edit'),
('intake_clerk', 'requests.view'),
('intake_clerk', 'software.create'),
('intake_clerk', 'software.edit'),
('intake_clerk', 'software.view'),
('intake_clerk', 'spare_parts.create'),
('intake_clerk', 'spare_parts.view'),
('intake_clerk', 'teams.view')
ON CONFLICT DO NOTHING;

-- Machine Shop Operator - machine shop focused, plus the same
-- broadened cross-queue view/create access as every other non-admin role
INSERT INTO role_permissions (role, permission_name) VALUES
('machine_shop_operator', 'battery_charging.assignee'),
('machine_shop_operator', 'battery_charging.create'),
('machine_shop_operator', 'battery_charging.view'),
('machine_shop_operator', 'documentation.view'),
('machine_shop_operator', 'hardware.create'),
('machine_shop_operator', 'hardware.view'),
('machine_shop_operator', 'inventory.view'),
('machine_shop_operator', 'machine_shop.assignee'),
('machine_shop_operator', 'machine_shop.create'),
('machine_shop_operator', 'machine_shop.edit'),
('machine_shop_operator', 'machine_shop.view'),
('machine_shop_operator', 'matches.view'),
('machine_shop_operator', 'requests.create'),
('machine_shop_operator', 'requests.status_update'),
('machine_shop_operator', 'requests.view'),
('machine_shop_operator', 'software.create'),
('machine_shop_operator', 'software.view'),
('machine_shop_operator', 'spare_parts.create'),
('machine_shop_operator', 'spare_parts.view'),
('machine_shop_operator', 'teams.view')
ON CONFLICT DO NOTHING;

-- Spare Parts Attendant - inventory management, plus the same
-- broadened cross-queue view/create access as every other non-admin role
INSERT INTO role_permissions (role, permission_name) VALUES
('spare_parts_attendant', 'battery_charging.assignee'),
('spare_parts_attendant', 'battery_charging.create'),
('spare_parts_attendant', 'battery_charging.view'),
('spare_parts_attendant', 'documentation.view'),
('spare_parts_attendant', 'hardware.create'),
('spare_parts_attendant', 'hardware.view'),
('spare_parts_attendant', 'inventory.view'),
('spare_parts_attendant', 'machine_shop.create'),
('spare_parts_attendant', 'machine_shop.view'),
('spare_parts_attendant', 'matches.view'),
('spare_parts_attendant', 'requests.create'),
('spare_parts_attendant', 'requests.view'),
('spare_parts_attendant', 'software.create'),
('spare_parts_attendant', 'software.view'),
('spare_parts_attendant', 'spare_parts.create'),
('spare_parts_attendant', 'spare_parts.edit'),
('spare_parts_attendant', 'spare_parts.issue'),
('spare_parts_attendant', 'spare_parts.receive'),
('spare_parts_attendant', 'spare_parts.view'),
('spare_parts_attendant', 'teams.view')
ON CONFLICT DO NOTHING;

-- Flying Squad Software - software repair specialists, plus the same
-- broadened cross-queue view/create access as every other non-admin role
INSERT INTO role_permissions (role, permission_name) VALUES
('flying_squad_software', 'battery_charging.create'),
('flying_squad_software', 'battery_charging.view'),
('flying_squad_software', 'documentation.view'),
('flying_squad_software', 'hardware.create'),
('flying_squad_software', 'hardware.view'),
('flying_squad_software', 'inventory.view'),
('flying_squad_software', 'machine_shop.create'),
('flying_squad_software', 'machine_shop.view'),
('flying_squad_software', 'matches.view'),
('flying_squad_software', 'requests.create'),
('flying_squad_software', 'requests.status_update'),
('flying_squad_software', 'requests.view'),
('flying_squad_software', 'software.assignee'),
('flying_squad_software', 'software.create'),
('flying_squad_software', 'software.edit'),
('flying_squad_software', 'software.view'),
('flying_squad_software', 'spare_parts.create'),
('flying_squad_software', 'spare_parts.view'),
('flying_squad_software', 'teams.view')
ON CONFLICT DO NOTHING;

-- Flying Squad Hardware - hardware repair specialists, plus the same
-- broadened cross-queue view/create access as every other non-admin role
INSERT INTO role_permissions (role, permission_name) VALUES
('flying_squad_hardware', 'battery_charging.create'),
('flying_squad_hardware', 'battery_charging.view'),
('flying_squad_hardware', 'documentation.view'),
('flying_squad_hardware', 'hardware.assignee'),
('flying_squad_hardware', 'hardware.create'),
('flying_squad_hardware', 'hardware.edit'),
('flying_squad_hardware', 'hardware.view'),
('flying_squad_hardware', 'inventory.view'),
('flying_squad_hardware', 'machine_shop.create'),
('flying_squad_hardware', 'machine_shop.view'),
('flying_squad_hardware', 'matches.view'),
('flying_squad_hardware', 'requests.create'),
('flying_squad_hardware', 'requests.status_update'),
('flying_squad_hardware', 'requests.view'),
('flying_squad_hardware', 'software.create'),
('flying_squad_hardware', 'software.view'),
('flying_squad_hardware', 'spare_parts.create'),
('flying_squad_hardware', 'spare_parts.issue'),
('flying_squad_hardware', 'spare_parts.view'),
('flying_squad_hardware', 'teams.view')
ON CONFLICT DO NOTHING;

-- Admin - full access
INSERT INTO role_permissions (role, permission_name) VALUES
('admin', 'admin.dashboard'),
('admin', 'admin.permissions'),
('admin', 'admin.reports'),
('admin', 'admin.requests'),
('admin', 'admin.roles'),
('admin', 'admin.system'),
('admin', 'admin.users'),
('admin', 'battery_charging.configure'),
('admin', 'battery_charging.create'),
('admin', 'battery_charging.edit'),
('admin', 'battery_charging.return'),
('admin', 'battery_charging.view'),
('admin', 'battery_swaps.configure'),
('admin', 'battery_swaps.create'),
('admin', 'battery_swaps.edit'),
('admin', 'battery_swaps.return'),
('admin', 'battery_swaps.view'),
('admin', 'documentation.view'),
('admin', 'hardware.create'),
('admin', 'hardware.edit'),
('admin', 'hardware.view'),
('admin', 'inventory.view'),
('admin', 'machine_shop.create'),
('admin', 'machine_shop.edit'),
('admin', 'machine_shop.view'),
('admin', 'matches.view'),
('admin', 'requests.assign'),
('admin', 'requests.create'),
('admin', 'requests.delete'),
('admin', 'requests.edit'),
('admin', 'requests.status_update'),
('admin', 'requests.view'),
('admin', 'software.create'),
('admin', 'software.edit'),
('admin', 'software.view'),
('admin', 'spare_parts.create'),
('admin', 'spare_parts.edit'),
('admin', 'spare_parts.issue'),
('admin', 'spare_parts.receive'),
('admin', 'spare_parts.view'),
('admin', 'teams.view')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_handled_by ON requests(handled_by);
CREATE INDEX IF NOT EXISTS idx_spare_parts_status ON spare_parts(status);
CREATE INDEX IF NOT EXISTS idx_spare_parts_country_code ON spare_parts(country_code);
CREATE INDEX IF NOT EXISTS idx_spare_parts_submitted_by ON spare_parts(submitted_by);
CREATE INDEX IF NOT EXISTS idx_spare_parts_fgc_part_number ON spare_parts(fgc_part_number);
CREATE INDEX IF NOT EXISTS idx_requests_season ON requests(season);
CREATE INDEX IF NOT EXISTS idx_spare_parts_season ON spare_parts(season);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_status ON battery_swaps(status);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_country_code ON battery_swaps(country_code);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_season ON battery_swaps(season);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_submitted_by ON battery_swaps(submitted_by);
CREATE INDEX IF NOT EXISTS idx_battery_swaps_outstanding_lookup ON battery_swaps(country_code, device_type, status);
CREATE INDEX IF NOT EXISTS idx_battery_units_season ON battery_units(season);
CREATE INDEX IF NOT EXISTS idx_teams_country_code ON teams(country_code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_name ON role_permissions(permission_name);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_spare_parts_updated_at
    BEFORE UPDATE ON spare_parts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_battery_swaps_updated_at
    BEFORE UPDATE ON battery_swaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
