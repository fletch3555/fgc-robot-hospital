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
INSERT INTO roles (id, name, description) VALUES
('guest', 'Guest', 'Read-only access to basic information'),
('intake_clerk', 'Intake Clerk', 'Can create and view requests'),
('machine_shop_operator', 'Machine Shop Operator', 'Can handle machine shop requests'),
('spare_parts_attendant', 'Spare Parts Attendant', 'Can manage spare parts requests'),
('flying_squad_software', 'Flying Squad - Software', 'Can handle software support requests'),
('flying_squad_hardware', 'Flying Squad - Hardware', 'Can handle hardware support requests'),
('robot_inspector', 'Robot Inspector', 'Can inspect and approve robots'),
('lead_robot_inspector', 'Lead Robot Inspector', 'Senior inspector with additional permissions'),
('admin', 'Administrator', 'Full system access')
ON CONFLICT (id) DO NOTHING;

-- Users table (no single role column - uses many-to-many relationship)
-- id must be an existing auth.users(id) — created via Supabase Auth
-- (supabase.auth.admin.createUser), never generated locally.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
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
    -- Event year this record belongs to; see migrations/README.md
    season INTEGER NOT NULL DEFAULT 2026,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
-- Guest (default) - very limited access + documentation
INSERT INTO role_permissions (role, permission_name) VALUES
('guest', 'requests.view'),
('guest', 'documentation.view'),
('guest', 'matches.view')
ON CONFLICT DO NOTHING;

-- Intake Clerk - can create and manage initial requests
INSERT INTO role_permissions (role, permission_name) VALUES
('intake_clerk', 'requests.view'),
('intake_clerk', 'requests.create'),
('intake_clerk', 'requests.edit'),
('intake_clerk', 'requests.assign'),
('intake_clerk', 'hardware.view'),
('intake_clerk', 'hardware.create'),
('intake_clerk', 'software.view'),
('intake_clerk', 'software.create'),
('intake_clerk', 'machine_shop.view'),
('intake_clerk', 'machine_shop.create'),
('intake_clerk', 'spare_parts.view'),
('intake_clerk', 'documentation.view'),
('intake_clerk', 'inventory.view'),
('intake_clerk', 'matches.view'),
('intake_clerk', 'battery_swaps.view'),
('intake_clerk', 'battery_swaps.create'),
('intake_clerk', 'battery_swaps.edit'),
('intake_clerk', 'battery_swaps.return')
ON CONFLICT DO NOTHING;

-- Machine Shop Operator - machine shop focused
INSERT INTO role_permissions (role, permission_name) VALUES
('machine_shop_operator', 'requests.view'),
('machine_shop_operator', 'requests.status_update'),
('machine_shop_operator', 'machine_shop.view'),
('machine_shop_operator', 'machine_shop.create'),
('machine_shop_operator', 'machine_shop.edit'),
('machine_shop_operator', 'machine_shop.assignee'),
('machine_shop_operator', 'spare_parts.view'),
('machine_shop_operator', 'documentation.view'),
('machine_shop_operator', 'inventory.view')
ON CONFLICT DO NOTHING;

-- Spare Parts Attendant - inventory management
INSERT INTO role_permissions (role, permission_name) VALUES
('spare_parts_attendant', 'requests.view'),
('spare_parts_attendant', 'spare_parts.view'),
('spare_parts_attendant', 'spare_parts.create'),
('spare_parts_attendant', 'spare_parts.edit'),
('spare_parts_attendant', 'spare_parts.issue'),
('spare_parts_attendant', 'spare_parts.receive'),
('spare_parts_attendant', 'inventory.view'),
('spare_parts_attendant', 'documentation.view')
ON CONFLICT DO NOTHING;

-- Flying Squad Software - software repair specialists
INSERT INTO role_permissions (role, permission_name) VALUES
('flying_squad_software', 'requests.view'),
('flying_squad_software', 'requests.status_update'),
('flying_squad_software', 'software.view'),
('flying_squad_software', 'software.create'),
('flying_squad_software', 'software.edit'),
('flying_squad_software', 'software.assignee'),
('flying_squad_software', 'spare_parts.view'),
('flying_squad_software', 'spare_parts.create'),
('flying_squad_software', 'documentation.view'),
('flying_squad_software', 'inventory.view')
ON CONFLICT DO NOTHING;

-- Flying Squad Hardware - hardware repair specialists  
INSERT INTO role_permissions (role, permission_name) VALUES
('flying_squad_hardware', 'requests.view'),
('flying_squad_hardware', 'requests.status_update'),
('flying_squad_hardware', 'hardware.view'),
('flying_squad_hardware', 'hardware.create'),
('flying_squad_hardware', 'hardware.edit'),
('flying_squad_hardware', 'hardware.assignee'),
('flying_squad_hardware', 'spare_parts.view'),
('flying_squad_hardware', 'spare_parts.issue'),
('flying_squad_hardware', 'documentation.view'),
('flying_squad_hardware', 'inventory.view')
ON CONFLICT DO NOTHING;

-- -- Robot Inspector - inspection focused
-- INSERT INTO role_permissions (role, permission_name) VALUES
-- ('robot_inspector', 'requests.view'),
-- ('robot_inspector', 'inspection.view'),
-- ('robot_inspector', 'inspection.create'),
-- ('robot_inspector', 'inspection.edit'),
-- ('robot_inspector', 'hardware.view'),
-- ('robot_inspector', 'software.view'),
-- ('robot_inspector', 'documentation.view'),
-- ('robot_inspector', 'matches.view')
-- ON CONFLICT DO NOTHING;

-- -- Lead Robot Inspector - senior inspection role
-- INSERT INTO role_permissions (role, permission_name) VALUES
-- ('lead_robot_inspector', 'requests.view'),
-- ('lead_robot_inspector', 'requests.assign'),
-- ('lead_robot_inspector', 'inspection.view'),
-- ('lead_robot_inspector', 'inspection.create'),
-- ('lead_robot_inspector', 'inspection.edit'),
-- ('lead_robot_inspector', 'inspection.approve'),
-- ('lead_robot_inspector', 'hardware.view'),
-- ('lead_robot_inspector', 'software.view'),
-- ('lead_robot_inspector', 'documentation.view'),
-- ('lead_robot_inspector', 'inventory.view'),
-- ('lead_robot_inspector', 'matches.view')
-- ON CONFLICT DO NOTHING;

-- Admin - full access
INSERT INTO role_permissions (role, permission_name) VALUES
('admin', 'requests.view'),
('admin', 'requests.create'),
('admin', 'requests.edit'),
('admin', 'requests.delete'),
('admin', 'requests.assign'),
('admin', 'requests.status_update'),
('admin', 'hardware.view'),
('admin', 'hardware.create'),
('admin', 'hardware.edit'),
('admin', 'software.view'),
('admin', 'software.create'),
('admin', 'software.edit'),
('admin', 'machine_shop.view'),
('admin', 'machine_shop.create'),
('admin', 'machine_shop.edit'),
('admin', 'machine_shop.assignee'),
('admin', 'spare_parts.view'),
('admin', 'spare_parts.create'),
('admin', 'spare_parts.edit'),
('admin', 'spare_parts.issue'),
('admin', 'spare_parts.receive'),
-- ('admin', 'inspection.view'),
-- ('admin', 'inspection.create'),
-- ('admin', 'inspection.edit'),
-- ('admin', 'inspection.approve'),
('admin', 'admin.dashboard'),
('admin', 'admin.roles'),
('admin', 'admin.permissions'),
('admin', 'admin.users'),
('admin', 'admin.requests'),
('admin', 'admin.system'),
('admin', 'admin.reports'),
('admin', 'documentation.view'),
('admin', 'inventory.view'),
('admin', 'matches.view'),
('admin', 'battery_swaps.view'),
('admin', 'battery_swaps.create'),
('admin', 'battery_swaps.edit'),
('admin', 'battery_swaps.return')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
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
