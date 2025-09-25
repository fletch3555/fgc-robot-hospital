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
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
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
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
    submitted_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    -- Type-specific data stored as JSON
    hardware_data JSONB,
    software_data JSONB,
    machine_shop_data JSONB,
    battery_charging_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spare Parts table
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(3) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    is_loan BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL CHECK (status IN ('issued', 'returned')),
    submitted_by UUID NOT NULL REFERENCES users(id),
    handled_by UUID REFERENCES users(id),
    notes TEXT[],
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

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
-- Request Management
('requests.view', 'View support requests', 'requests'),
('requests.create', 'Create new support requests', 'requests'),
('requests.edit', 'Edit support requests', 'requests'),
('requests.delete', 'Delete support requests', 'requests'),
('requests.assign', 'Assign requests to users', 'requests'),
('requests.status_update', 'Update request status', 'requests'),

-- Hardware Requests
('hardware.view', 'View hardware requests', 'hardware'),
('hardware.create', 'Create hardware requests', 'hardware'),
('hardware.edit', 'Edit hardware requests', 'hardware'),
('hardware.repair', 'Perform hardware repairs', 'hardware'),

-- Software Requests  
('software.view', 'View software requests', 'software'),
('software.create', 'Create software requests', 'software'),
('software.edit', 'Edit software requests', 'software'),
('software.debug', 'Debug and fix software issues', 'software'),

-- Machine Shop
('machine_shop.view', 'View machine shop requests', 'machine_shop'),
('machine_shop.create', 'Create machine shop requests', 'machine_shop'),
('machine_shop.edit', 'Edit machine shop requests', 'machine_shop'),
('machine_shop.operate', 'Operate machine shop equipment', 'machine_shop'),

-- Spare Parts
('spare_parts.view', 'View spare parts inventory', 'spare_parts'),
('spare_parts.create', 'Add new spare parts', 'spare_parts'),
('spare_parts.edit', 'Edit spare parts', 'spare_parts'),
('spare_parts.issue', 'Issue spare parts', 'spare_parts'),
('spare_parts.receive', 'Receive returned spare parts', 'spare_parts'),

-- Robot Inspection
('inspection.view', 'View inspection reports', 'inspection'),
('inspection.create', 'Create inspection reports', 'inspection'),
('inspection.edit', 'Edit inspection reports', 'inspection'),
('inspection.approve', 'Approve inspection reports', 'inspection'),

-- User Management
('users.view', 'View user list', 'users'),
('users.create', 'Create new users', 'users'),
('users.edit', 'Edit user information', 'users'),
('users.delete', 'Delete users', 'users'),
('users.role_assign', 'Assign roles to users', 'users'),

-- Admin Functions
('admin.dashboard', 'Access admin dashboard', 'admin'),
('admin.roles', 'Manage roles and permissions', 'admin'),
('admin.system', 'System administration', 'admin'),
('admin.reports', 'Generate reports', 'admin'),

-- Reference Materials & Documentation
('documentation.view', 'View documentation and guides', 'documentation'),
('inventory.view', 'View FGC inventory', 'inventory'),
('matches.view', 'View match schedules', 'matches')

ON CONFLICT (name) DO NOTHING;

-- Insert default role permissions
-- Guest (default) - very limited access + documentation
INSERT INTO role_permissions (role, permission_id) 
SELECT 'guest', id FROM permissions WHERE name IN (
    'requests.view', 'documentation.view', 'matches.view'
) ON CONFLICT DO NOTHING;

-- Intake Clerk - can create and manage initial requests
INSERT INTO role_permissions (role, permission_id) 
SELECT 'intake_clerk', id FROM permissions WHERE name IN (
    'requests.view', 'requests.create', 'requests.edit', 'requests.assign',
    'hardware.view', 'hardware.create', 'software.view', 'software.create',
    'machine_shop.view', 'machine_shop.create', 'spare_parts.view',
    'documentation.view', 'inventory.view', 'matches.view'
) ON CONFLICT DO NOTHING;

-- Machine Shop Operator - machine shop focused
INSERT INTO role_permissions (role, permission_id) 
SELECT 'machine_shop_operator', id FROM permissions WHERE name IN (
    'requests.view', 'requests.status_update', 'machine_shop.view', 
    'machine_shop.create', 'machine_shop.edit', 'machine_shop.operate',
    'spare_parts.view', 'documentation.view', 'inventory.view'
) ON CONFLICT DO NOTHING;

-- Spare Parts Attendant - inventory management
INSERT INTO role_permissions (role, permission_id) 
SELECT 'spare_parts_attendant', id FROM permissions WHERE name IN (
    'requests.view', 'spare_parts.view', 'spare_parts.create', 
    'spare_parts.edit', 'spare_parts.issue', 'spare_parts.receive',
    'inventory.view', 'documentation.view'
) ON CONFLICT DO NOTHING;

-- Flying Squad Software - software repair specialists
INSERT INTO role_permissions (role, permission_id) 
SELECT 'flying_squad_software', id FROM permissions WHERE name IN (
    'requests.view', 'requests.status_update', 'software.view', 
    'software.create', 'software.edit', 'software.debug',
    'spare_parts.view', 'documentation.view', 'inventory.view'
) ON CONFLICT DO NOTHING;

-- Flying Squad Hardware - hardware repair specialists  
INSERT INTO role_permissions (role, permission_id) 
SELECT 'flying_squad_hardware', id FROM permissions WHERE name IN (
    'requests.view', 'requests.status_update', 'hardware.view',
    'hardware.create', 'hardware.edit', 'hardware.repair',
    'spare_parts.view', 'spare_parts.issue', 'documentation.view', 'inventory.view'
) ON CONFLICT DO NOTHING;

-- Robot Inspector - inspection focused
INSERT INTO role_permissions (role, permission_id) 
SELECT 'robot_inspector', id FROM permissions WHERE name IN (
    'requests.view', 'inspection.view', 'inspection.create', 
    'inspection.edit', 'hardware.view', 'software.view',
    'documentation.view', 'matches.view'
) ON CONFLICT DO NOTHING;

-- Lead Robot Inspector - senior inspection role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'lead_robot_inspector', id FROM permissions WHERE name IN (
    'requests.view', 'requests.assign', 'inspection.view', 
    'inspection.create', 'inspection.edit', 'inspection.approve',
    'hardware.view', 'software.view', 'users.view',
    'documentation.view', 'inventory.view', 'matches.view'
) ON CONFLICT DO NOTHING;

-- Admin - full access
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions 
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
CREATE INDEX IF NOT EXISTS idx_teams_country_code ON teams(country_code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

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

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
