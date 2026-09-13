/**
 * Authorization Module - Consolidated RBAC and Permission Management
 * 
 * This module provides a unified interface for all authorization-related functionality
 * including role-based access control (RBAC), permission checking, and session management.
 */

import { NextResponse } from "next/server";
import { getCurrentUserWithRoles } from "@/lib/supabase/session";
import { query } from "@/lib/database";
import { Role, Permission, PermissionCategory, RoleMetadata, PermissionName, AppSession } from "./auth-types";

// =============================================================================
// Permission Definitions
// =============================================================================

export const PERMISSIONS: Record<PermissionName, Permission> = {
  // Request Management
  'requests.view': {
    name: 'requests.view',
    description: 'View support requests',
    category: 'requests'
  },
  'requests.create': {
    name: 'requests.create',
    description: 'Create new support requests',
    category: 'requests'
  },
  'requests.edit': {
    name: 'requests.edit',
    description: 'Edit support requests',
    category: 'requests'
  },
  'requests.delete': {
    name: 'requests.delete',
    description: 'Delete support requests',
    category: 'requests'
  },
  'requests.assign': {
    name: 'requests.assign',
    description: 'Assign requests to users',
    category: 'requests'
  },
  'requests.status_update': {
    name: 'requests.status_update',
    description: 'Update request status',
    category: 'requests'
  },

  // Hardware Support
  'hardware.view': {
    name: 'hardware.view',
    description: 'View hardware requests',
    category: 'hardware'
  },
  'hardware.create': {
    name: 'hardware.create',
    description: 'Create hardware requests',
    category: 'hardware'
  },
  'hardware.edit': {
    name: 'hardware.edit',
    description: 'Edit hardware requests',
    category: 'hardware'
  },
  'hardware.assignee': {
    name: 'hardware.assignee',
    description: 'Can be assigned to hardware requests',
    category: 'hardware'
  },

  // Software Support
  'software.view': {
    name: 'software.view',
    description: 'View software requests',
    category: 'software'
  },
  'software.create': {
    name: 'software.create',
    description: 'Create software requests',
    category: 'software'
  },
  'software.edit': {
    name: 'software.edit',
    description: 'Edit software requests',
    category: 'software'
  },
  'software.assignee': {
    name: 'software.assignee',
    description: 'Can be assigned to software requests',
    category: 'software'
  },

  // Machine Shop
  'machine_shop.view': {
    name: 'machine_shop.view',
    description: 'View machine shop requests',
    category: 'machine_shop'
  },
  'machine_shop.create': {
    name: 'machine_shop.create',
    description: 'Create machine shop requests',
    category: 'machine_shop'
  },
  'machine_shop.edit': {
    name: 'machine_shop.edit',
    description: 'Edit machine shop requests',
    category: 'machine_shop'
  },
  'machine_shop.assignee': {
    name: 'machine_shop.assignee',
    description: 'Can be assigned to machine shop requests',
    category: 'machine_shop'
  },

  // Battery Charging
  'battery_charging.view': {
    name: 'battery_charging.view',
    description: 'View battery charging requests',
    category: 'battery_charging'
  },
  'battery_charging.create': {
    name: 'battery_charging.create',
    description: 'Create battery charging requests',
    category: 'battery_charging'
  },
  'battery_charging.edit': {
    name: 'battery_charging.edit',
    description: 'Edit battery charging requests',
    category: 'battery_charging'
  },
  'battery_charging.assignee': {
    name: 'battery_charging.assignee',
    description: 'Can be assigned to battery charging requests',
    category: 'battery_charging'
  },

  // Spare Parts
  'spare_parts.view': {
    name: 'spare_parts.view',
    description: 'View spare parts inventory',
    category: 'spare_parts'
  },
  'spare_parts.create': {
    name: 'spare_parts.create',
    description: 'Add new spare parts',
    category: 'spare_parts'
  },
  'spare_parts.edit': {
    name: 'spare_parts.edit',
    description: 'Edit spare parts',
    category: 'spare_parts'
  },
  'spare_parts.issue': {
    name: 'spare_parts.issue',
    description: 'Issue spare parts',
    category: 'spare_parts'
  },
  'spare_parts.receive': {
    name: 'spare_parts.receive',
    description: 'Receive returned spare parts',
    category: 'spare_parts'
  },

  // Battery Swaps
  'battery_swaps.view': {
    name: 'battery_swaps.view',
    description: 'View battery swap records',
    category: 'battery_swaps'
  },
  'battery_swaps.create': {
    name: 'battery_swaps.create',
    description: 'Record a new battery swap with a team',
    category: 'battery_swaps'
  },
  'battery_swaps.edit': {
    name: 'battery_swaps.edit',
    description: 'Correct an existing battery swap record',
    category: 'battery_swaps'
  },
  'battery_swaps.return': {
    name: 'battery_swaps.return',
    description: 'Mark a battery swap as returned',
    category: 'battery_swaps'
  },

  // // Robot Inspection
  // 'inspection.view': {
  //   name: 'inspection.view',
  //   description: 'View inspection reports',
  //   category: 'inspection'
  // },
  // 'inspection.create': {
  //   name: 'inspection.create',
  //   description: 'Create inspection reports',
  //   category: 'inspection'
  // },
  // 'inspection.edit': {
  //   name: 'inspection.edit',
  //   description: 'Edit inspection reports',
  //   category: 'inspection'
  // },
  // 'inspection.approve': {
  //   name: 'inspection.approve',
  //   description: 'Approve inspection reports',
  //   category: 'inspection'
  // },

  // Admin Functions
  'admin.dashboard': {
    name: 'admin.dashboard',
    description: 'Access admin dashboard',
    category: 'admin'
  },
  'admin.roles': {
    name: 'admin.roles',
    description: 'Manage roles and permissions',
    category: 'admin'
  },
  'admin.permissions': {
    name: 'admin.permissions',
    description: 'Manage system permissions',
    category: 'admin'
  },
  'admin.users': {
    name: 'admin.users',
    description: 'Manage user accounts',
    category: 'admin'
  },
  'admin.requests': {
    name: 'admin.requests',
    description: 'Manage all requests',
    category: 'admin'
  },
  'admin.system': {
    name: 'admin.system',
    description: 'System administration',
    category: 'admin'
  },
  'admin.reports': {
    name: 'admin.reports',
    description: 'Generate reports',
    category: 'admin'
  },

  // Reference & Documentation
  'documentation.view': {
    name: 'documentation.view',
    description: 'View documentation and guides',
    category: 'documentation'
  },
  'inventory.view': {
    name: 'inventory.view',
    description: 'View FGC inventory',
    category: 'inventory'
  },
  'matches.view': {
    name: 'matches.view',
    description: 'View match schedules',
    category: 'matches'
  },
  'teams.view': {
    name: 'teams.view',
    description: 'View team information',
    category: 'teams'
  }
};

/**
 * Get all permissions as an array
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

/**
 * Get permissions grouped by category
 */
export function getPermissionsByCategory(): Partial<Record<PermissionCategory, Permission[]>> {
  const grouped: Partial<Record<PermissionCategory, Permission[]>> = {};

  Object.values(PERMISSIONS).forEach(permission => {
    if (!grouped[permission.category]) {
      grouped[permission.category] = [];
    }
    grouped[permission.category]?.push(permission);
  });
  
  return grouped;
}

/**
 * Get permission by name (with type safety)
 */
export function getPermission(name: PermissionName): Permission {
  return PERMISSIONS[name];
}

// =============================================================================
// Types and Interfaces
// =============================================================================

// Server-specific interfaces (client-safe types are imported from auth-types.ts)

export interface RolePermission {
  id: string;
  role: Role;
  permission_id: string;
  granted_at: string;
}

export interface RoleWithPermissions {
  role: Role;
  permissions: Permission[];
}

export interface AuthzResult {
  authorized: boolean;
  response: NextResponse | null;
  session?: AppSession;
  permissions?: PermissionName[];
}

// =============================================================================
// Role Metadata Configuration
// =============================================================================

export const ROLE_METADATA: Record<Role, RoleMetadata> = {
  guest: {
    role: 'guest',
    displayName: 'Guest',
    description: 'Limited read-only access to basic information',
    color: '#9e9e9e',
    isDefault: true
  },
  intake_clerk: {
    role: 'intake_clerk',
    displayName: 'Intake Clerk',
    description: 'Can create and manage initial support requests',
    color: '#2196f3'
  },
  machine_shop_operator: {
    role: 'machine_shop_operator',
    displayName: 'Machine Shop Operator',
    description: 'Manages machine shop operations and equipment',
    color: '#ff9800'
  },
  spare_parts_attendant: {
    role: 'spare_parts_attendant',
    displayName: 'Spare Parts Attendant',
    description: 'Manages spare parts inventory and distribution',
    color: '#4caf50'
  },
  flying_squad_software: {
    role: 'flying_squad_software',
    displayName: 'Flying Squad - Software',
    description: 'Software troubleshooting and repair specialist',
    color: '#9c27b0'
  },
  flying_squad_hardware: {
    role: 'flying_squad_hardware',
    displayName: 'Flying Squad - Hardware',
    description: 'Hardware troubleshooting and repair specialist',
    color: '#f44336'
  },
  // robot_inspector: {
  //   role: 'robot_inspector',
  //   displayName: 'Robot Inspector',
  //   description: 'Performs robot inspections and quality checks',
  //   color: '#795548'
  // },
  // lead_robot_inspector: {
  //   role: 'lead_robot_inspector',
  //   displayName: 'Lead Robot Inspector',
  //   description: 'Lead inspector with advanced permissions',
  //   color: '#607d8b'
  // },
  admin: {
    role: 'admin',
    displayName: 'Administrator',
    description: 'Full system access and administrative privileges',
    color: '#e91e63'
  }
};

// =============================================================================
// Permission Registry - Code-based permission definitions
// =============================================================================

/**
 * Registry for code-based permission definitions and utilities
 * All permission definitions are managed in code for type safety and performance
 */
export class PermissionRegistry {
  /**
   * Get all available permissions from code definitions
   */
  static getAllPermissions(): Permission[] {
    return getAllPermissions();
  }

  /**
   * Get permissions grouped by category
   */
  static getPermissionsByCategory(): Record<string, Permission[]> {
    return getPermissionsByCategory();
  }

  /**
   * Get a specific permission by name
   */
  static getPermission(name: PermissionName): Permission | undefined {
    return PERMISSIONS[name];
  }

  /**
   * Check if a permission name exists
   */
  static isValidPermission(name: string): name is PermissionName {
    return name in PERMISSIONS;
  }
}

// =============================================================================
// Role Permission Service - Database-based role assignments
// =============================================================================

/**
 * Service for managing role-permission assignments in the database
 * Handles which roles have which permissions
 */
export class RolePermissionService {
  /**
   * Get permission names assigned to a specific role
   */
  static async getPermissionNamesForRole(role: Role): Promise<string[]> {
    try {
      const result = await query(
        `SELECT rp.permission_name FROM role_permissions rp
         WHERE rp.role = $1
         ORDER BY rp.permission_name`,
        [role]
      );
      return result.rows.map((row: { permission_name: string }) => row.permission_name);
    } catch (error) {
      console.error('Error fetching role permission names:', error);
      throw error;
    }
  }

  /**
   * Get full permission objects for a specific role
   */
  static async getPermissionsForRole(role: Role): Promise<Permission[]> {
    try {
      const result = await query(
        `SELECT rp.permission_name FROM role_permissions rp
         WHERE rp.role = $1
         ORDER BY rp.permission_name`,
        [role]
      );
      
      // Map to Permission objects from code
      const permissions: Permission[] = [];
      for (const row of result.rows) {
        const perm = PERMISSIONS[row.permission_name as PermissionName];
        if (perm) {
          permissions.push({
            name: perm.name,
            description: perm.description,
            category: perm.category,
          });
        }
      }
      return permissions;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw error;
    }
  }

  /**
   * Check if a role has a specific permission
   */
  static async roleHasPermission(role: Role, permissionName: PermissionName): Promise<boolean> {
    try {
      const result = await query(
        `SELECT EXISTS(
           SELECT 1 FROM role_permissions rp
           WHERE rp.role = $1 AND rp.permission_name = $2
         ) as has_permission`,
        [role, permissionName]
      );
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      console.error('Error checking role permission:', error);
      throw error;
    }
  }

  /**
   * Get permissions grouped by category for a role
   */
  static async getPermissionsByCategory(role?: Role): Promise<Record<string, Permission[]>> {
    try {
      let rolePermissions: string[] = [];
      
      if (role) {
        // Get permissions assigned to this role
        rolePermissions = await this.getPermissionNamesForRole(role);
      }
      
      // Get all permissions from code
      const allPermissions = getAllPermissions();
      
      // Group by category and mark which ones the role has
      const grouped: Record<string, Permission[]> = {};
      for (const perm of allPermissions) {
        if (!grouped[perm.category]) {
          grouped[perm.category] = [];
        }
        
        const hasPermission = role ? rolePermissions.includes(perm.name) : false;
        
        grouped[perm.category].push({
          name: perm.name,
          description: perm.description,
          category: perm.category,
          has_permission: hasPermission // Add this field for UI
        } as Permission & { has_permission: boolean });
      }
      
      return grouped;
    } catch (error) {
      console.error('Error fetching permissions by category:', error);
      throw error;
    }
  }

  /**
   * Update role permissions (replace all permissions for a role)
   */
  static async updateRolePermissions(role: Role, permissionNames: PermissionName[]): Promise<void> {
    try {
      // Start transaction
      await query('BEGIN', []);

      // Remove all existing permissions for the role
      await query('DELETE FROM role_permissions WHERE role = $1', [role]);

      // Add new permissions
      if (permissionNames.length > 0) {
        const values = permissionNames.map((_, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        await query(
          `INSERT INTO role_permissions (role, permission_name) VALUES ${values}`,
          [role, ...permissionNames]
        );
      }

      // Commit transaction
      await query('COMMIT', []);
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK', []);
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  /**
   * Grant permission to role
   */
  static async grantPermissionToRole(role: Role, permissionName: PermissionName): Promise<void> {
    try {
      await query(
        'INSERT INTO role_permissions (role, permission_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [role, permissionName]
      );
    } catch (error) {
      console.error('Error granting permission to role:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from role
   */
  static async revokePermissionFromRole(role: Role, permissionName: PermissionName): Promise<void> {
    try {
      await query(
        'DELETE FROM role_permissions WHERE role = $1 AND permission_name = $2',
        [role, permissionName]
      );
    } catch (error) {
      console.error('Error revoking permission from role:', error);
      throw error;
    }
  }
}

// =============================================================================
// User Authorization Service - Combines registry and role permissions
// =============================================================================

/**
 * Service for user authorization that combines code-based permissions with database role assignments
 * This is the main service for checking user permissions
 */
export class UserAuthorizationService {
  /**
   * Get permission names for a user (from all their roles)
   */
  static async getUserPermissionNames(userId: string): Promise<PermissionName[]> {
    try {
      const result = await query(
        `SELECT DISTINCT rp.permission_name
         FROM role_permissions rp
         JOIN user_roles ur ON rp.role = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );
      return result.rows.map((row: { permission_name: PermissionName }) => row.permission_name);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Get full permission objects for a user (from all their roles)
   */
  static async getPermissionsForUser(userId: string): Promise<Permission[]> {
    try {
      const result = await query(
        `SELECT DISTINCT rp.permission_name
         FROM role_permissions rp
         JOIN user_roles ur ON rp.role = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY rp.permission_name`,
        [userId]
      );
      
      // Map permission names to full permission objects from code
      const permissions: Permission[] = [];
      for (const row of result.rows) {
        const perm = PERMISSIONS[row.permission_name as PermissionName];
        if (perm) {
          permissions.push({
            name: perm.name,
            description: perm.description,
            category: perm.category,
          });
        }
      }
      return permissions;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  static async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    console.log(userId, permissionName);
    try {
      const result = await query(
        `SELECT EXISTS(
           SELECT 1 FROM role_permissions rp
           JOIN user_roles ur ON rp.role = ur.role_id
           WHERE ur.user_id = $1 AND rp.permission_name = $2
         ) as has_permission`,
        [userId, permissionName]
      );
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw error;
    }
  }

  /**
   * Check if a user has all required permissions
   */
  static async userHasAllPermissions(userId: string, permissionNames: PermissionName[]): Promise<boolean> {
    if (permissionNames.length === 0) return true;
    
    try {
      const userPermissions = await this.getUserPermissionNames(userId);
      return permissionNames.every(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }

  /**
   * Check if a user has any of the required permissions
   */
  static async userHasAnyPermission(userId: string, permissionNames: PermissionName[]): Promise<boolean> {
    if (permissionNames.length === 0) return true;
    
    try {
      const userPermissions = await this.getUserPermissionNames(userId);
      return permissionNames.some(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }
}

// =============================================================================
// Session and Authentication
// =============================================================================

/**
 * Get the current authenticated session
 */
export async function getAuthenticatedSession(): Promise<AppSession | null> {
  return getCurrentUserWithRoles();
}

/**
 * Require authentication (returns 401 if not authenticated)
 */
export async function requireAuth(): Promise<AuthzResult> {
  const session = await getAuthenticatedSession();
  
  if (!session || !session.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  return {
    authorized: true,
    response: null,
    session
  };
}

// =============================================================================
// Permission-Based Authorization
// =============================================================================

/**
 * Check if current user has specific permissions
 */
export async function checkPermissions(
  requiredPermissions: PermissionName[], 
  requireAll = true
): Promise<AuthzResult> {
  const session = await getAuthenticatedSession();
  
  if (!session || !session.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  try {
    const userPermissions = await UserAuthorizationService.getUserPermissionNames(session.user.id);
    
    let hasPermission = false;
    if (requireAll) {
      // User must have ALL required permissions
      hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
    } else {
      // User must have ANY of the required permissions
      hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );
    }

    if (!hasPermission) {
      return {
        authorized: false,
        response: NextResponse.json({
          error: 'Insufficient permissions',
          required: requiredPermissions,
          requireAll,
          userPermissions
        }, { status: 403 })
      };
    }

    return {
      authorized: true,
      response: null,
      session,
      permissions: userPermissions
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    };
  }
}

/**
 * Check if user has a specific permission (helper function)
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    return await UserAuthorizationService.userHasPermission(userId, permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    return await UserAuthorizationService.getUserPermissionNames(userId);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// =============================================================================
// Resource-Based Authorization
// =============================================================================

/**
 * Check if user can access a specific resource
 */
export async function canAccessResource(
  resourceType: string,
  resourceId: string,
  action: string,
  userId?: string
): Promise<boolean> {
  const session = await getAuthenticatedSession();
  
  if (!session || !session.user?.id) {
    return false;
  }

  const currentUserId = userId || session.user.id;

  // Admin can access everything
  if (session.user.roles?.includes('admin')) {
    return true;
  }

  try {
    // Check based on resource type and action
    switch (resourceType) {
      case 'request':
        return await canAccessRequest(resourceId, action, currentUserId);
      case 'user':
        return await canAccessUser(resourceId, action, currentUserId);
      case 'spare_part':
        return await canAccessSparePart(resourceId, action, currentUserId);
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking access to ${resourceType}:${resourceId}:${action}`, error);
    return false;
  }
}

/**
 * Check if user can access a specific request
 */
async function canAccessRequest(requestId: string, action: string, userId: string): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  
  switch (action) {
    case 'read':
      return userPermissions.includes('requests.read') || userPermissions.includes('requests.read_all');
    case 'write':
      return userPermissions.includes('requests.write') || userPermissions.includes('requests.write_all');
    case 'delete':
      return userPermissions.includes('requests.delete') || userPermissions.includes('requests.delete_all');
    default:
      return false;
  }
}

/**
 * Check if user can access a specific user record
 */
async function canAccessUser(targetUserId: string, action: string, currentUserId: string): Promise<boolean> {
  // Users can always access their own record
  if (targetUserId === currentUserId) {
    return true;
  }

  const userPermissions = await getUserPermissions(currentUserId);
  
  // User management is handled by admin.users permission
  switch (action) {
    case 'read':
    case 'write':
    case 'delete':
      return userPermissions.includes('admin.users');
    default:
      return false;
  }
}

/**
 * Check if user can access spare parts
 */
async function canAccessSparePart(sparePartId: string, action: string, userId: string): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  
  switch (action) {
    case 'read':
      return userPermissions.includes('spare_parts.read') || userPermissions.includes('spare_parts.read_all');
    case 'write':
      return userPermissions.includes('spare_parts.write') || userPermissions.includes('spare_parts.write_all');
    case 'delete':
      return userPermissions.includes('spare_parts.delete') || userPermissions.includes('spare_parts.delete_all');
    default:
      return false;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get roles with their permissions
 */
export async function getRolesWithPermissions(): Promise<(RoleMetadata & { permissions: Permission[] })[]> {
  try {
    const roles = Object.keys(ROLE_METADATA) as Role[];
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await RolePermissionService.getPermissionsForRole(role);
        return {
          ...ROLE_METADATA[role],
          permissions
        };
      })
    );
    return rolesWithPermissions;
  } catch (error) {
    console.error('Error fetching roles with permissions:', error);
    throw error;
  }
}
