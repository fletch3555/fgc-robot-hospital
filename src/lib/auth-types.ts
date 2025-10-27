/**
 * Shared authentication and authorization types for client and server use
 * This file contains only type definitions and does not import any server-side modules
 * 
 * Note: These types should match the interfaces in authz.ts but without server dependencies
 */

export type Role = 
  | 'guest'
  | 'intake_clerk'
  | 'machine_shop_operator'
  | 'spare_parts_attendant'
  | 'flying_squad_software'
  | 'flying_squad_hardware'
  // | 'robot_inspector'
  // | 'lead_robot_inspector'
  | 'admin';

export type PermissionCategory =
  | 'requests'
  | 'hardware'
  | 'software'
  | 'machine_shop'
  | 'battery_charging'
  | 'spare_parts'
  // | 'inspection'
  | 'admin'
  | 'documentation'
  | 'inventory'
  | 'matches'
  | 'teams';

export type PermissionName = 
  // Request Management
  | 'requests.view'
  | 'requests.create'
  | 'requests.edit'
  | 'requests.delete'
  | 'requests.assign'
  | 'requests.status_update'
  
  // Hardware Support
  | 'hardware.view'
  | 'hardware.create'
  | 'hardware.edit'
  | 'hardware.assignee'
  
  // Software Support
  | 'software.view'
  | 'software.create'
  | 'software.edit'
  | 'software.assignee'
  
  // Machine Shop
  | 'machine_shop.view'
  | 'machine_shop.create'
  | 'machine_shop.edit'
  | 'machine_shop.assignee'
  
  // Battery Charging
  | 'battery_charging.view'
  | 'battery_charging.create'
  | 'battery_charging.edit'
  | 'battery_charging.assignee'
  
  // Spare Parts
  | 'spare_parts.view'
  | 'spare_parts.create'
  | 'spare_parts.edit'
  | 'spare_parts.issue'
  | 'spare_parts.receive'
  
  // // Robot Inspection
  // | 'inspection.view'
  // | 'inspection.create'
  // | 'inspection.edit'
  // | 'inspection.approve'
  
  // Admin Functions
  | 'admin.dashboard'
  | 'admin.roles'
  | 'admin.permissions'
  | 'admin.users'
  | 'admin.requests'
  | 'admin.system'
  | 'admin.reports'
  
  // Reference & Documentation
  | 'documentation.view'
  | 'inventory.view'
  | 'matches.view'
  | 'teams.view';

// Database Permission interface (for API compatibility)
export interface Permission {
  name: PermissionName;
  description: string;
  category: PermissionCategory;
}

export interface RoleMetadata {
  role: Role;
  displayName: string;
  description: string;
  color: string;
  isDefault?: boolean;
}

export interface AuthError {
  message: string;
  code: string;
  status: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  permissions: string[];
}