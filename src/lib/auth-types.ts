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
  | 'robot_inspector'
  | 'lead_robot_inspector'
  | 'admin';

export type PermissionCategory = 
  | 'requests'
  | 'hardware' 
  | 'software'
  | 'machine_shop'
  | 'spare_parts'
  | 'inspection'
  | 'users'
  | 'admin';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  created_at: string;
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