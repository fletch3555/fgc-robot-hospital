/**
 * Authorization Module - Consolidated RBAC and Permission Management
 * 
 * This module provides a unified interface for all authorization-related functionality
 * including role-based access control (RBAC), permission checking, and session management.
 */

import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { authOptions } from "./authn";
import { query } from "./database";
import { Role, Permission, RoleMetadata } from "./auth-types";

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
  session?: Session;
  permissions?: string[];
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
  robot_inspector: {
    role: 'robot_inspector',
    displayName: 'Robot Inspector',
    description: 'Performs robot inspections and quality checks',
    color: '#795548'
  },
  lead_robot_inspector: {
    role: 'lead_robot_inspector',
    displayName: 'Lead Robot Inspector',
    description: 'Lead inspector with advanced permissions',
    color: '#607d8b'
  },
  admin: {
    role: 'admin',
    displayName: 'Administrator',
    description: 'Full system access and administrative privileges',
    color: '#e91e63'
  }
};

// =============================================================================
// Database Operations for Permissions
// =============================================================================

export class PermissionDB {
  /**
   * Get all permissions from the database
   */
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await query(
        'SELECT * FROM permissions ORDER BY category, name',
        []
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a specific role
   */
  static async getPermissionsForRole(role: Role): Promise<Permission[]> {
    try {
      const result = await query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role = $1
         ORDER BY p.category, p.name`,
        [role]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a user (considering all their roles)
   */
  static async getPermissionsForUser(userId: string): Promise<Permission[]> {
    try {
      const result = await query(
        `SELECT DISTINCT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY p.category, p.name`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Get permission names for a user
   */
  static async getUserPermissionNames(userId: string): Promise<string[]> {
    try {
      const result = await query(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );
      return result.rows.map((row: { name: string }) => row.name);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if a role has a specific permission
   */
  static async roleHasPermission(role: Role, permissionName: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role = $1 AND p.name = $2`,
        [role, permissionName]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking role permission:', error);
      throw error;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  static async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT user_has_permission($1, $2) as has_permission`,
        [userId, permissionName]
      );
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw error;
    }
  }

  /**
   * Get permissions grouped by category for a role
   */
  static async getPermissionsByCategory(role?: Role): Promise<Record<string, Permission[]>> {
    try {
      let query_str: string;
      let params: (string | Role)[];

      if (role) {
        query_str = `
          SELECT p.*, (rp.role IS NOT NULL) as has_permission
          FROM permissions p
          LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role = $1
          ORDER BY p.category, p.name
        `;
        params = [role];
      } else {
        query_str = `
          SELECT *, false as has_permission
          FROM permissions 
          ORDER BY category, name
        `;
        params = [];
      }

      const result = await query(query_str, params);
      
      // Group by category
      const grouped: Record<string, Permission[]> = {};
      for (const permission of result.rows) {
        if (!grouped[permission.category]) {
          grouped[permission.category] = [];
        }
        grouped[permission.category].push(permission);
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
  static async updateRolePermissions(role: Role, permissionIds: string[]): Promise<void> {
    try {
      // Start transaction
      await query('BEGIN', []);

      // Remove all existing permissions for the role
      await query('DELETE FROM role_permissions WHERE role = $1', [role]);

      // Add new permissions
      if (permissionIds.length > 0) {
        const values = permissionIds.map((_, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        await query(
          `INSERT INTO role_permissions (role, permission_id) VALUES ${values}`,
          [role, ...permissionIds]
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
  static async grantPermissionToRole(role: Role, permissionId: string): Promise<void> {
    try {
      await query(
        'INSERT INTO role_permissions (role, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [role, permissionId]
      );
    } catch (error) {
      console.error('Error granting permission to role:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from role
   */
  static async revokePermissionFromRole(role: Role, permissionId: string): Promise<void> {
    try {
      await query(
        'DELETE FROM role_permissions WHERE role = $1 AND permission_id = $2',
        [role, permissionId]
      );
    } catch (error) {
      console.error('Error revoking permission from role:', error);
      throw error;
    }
  }
}

// =============================================================================
// Session and Authentication
// =============================================================================

/**
 * Get the current authenticated session
 */
export async function getAuthenticatedSession(): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('Error getting authenticated session:', error);
    return null;
  }
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
  requiredPermissions: string[], 
  requireAll = true
): Promise<AuthzResult> {
  const session = await getAuthenticatedSession();
  
  if (!session || !session.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // Admin users have all permissions
  if (session.user.roles?.includes('admin')) {
    return {
      authorized: true,
      response: null,
      session,
      permissions: ['*'] // Admin has all permissions
    };
  }

  try {
    const userPermissions = await PermissionDB.getUserPermissionNames(session.user.id);
    
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
    return await PermissionDB.userHasPermission(userId, permission);
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
    return await PermissionDB.getUserPermissionNames(userId);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// =============================================================================
// Role-Based Authorization (Legacy Support)
// =============================================================================

/**
 * Check if current user has specific roles
 */
export async function checkRoles(requiredRoles: Role[], requireAll = false): Promise<AuthzResult> {
  const session = await getAuthenticatedSession();
  
  if (!session || !session.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  const userRoles = session.user.roles || [];
  
  let hasRole = false;
  if (requireAll) {
    // User must have ALL required roles
    hasRole = requiredRoles.every(role => userRoles.includes(role));
  } else {
    // User must have ANY of the required roles
    hasRole = requiredRoles.some(role => userRoles.includes(role));
  }

  if (!hasRole) {
    return {
      authorized: false,
      response: NextResponse.json({
        error: 'Insufficient role permissions',
        required: requiredRoles,
        requireAll,
        userRoles
      }, { status: 403 })
    };
  }

  return {
    authorized: true,
    response: null,
    session
  };
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthzResult> {
  return await checkRoles(['admin']);
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
  
  switch (action) {
    case 'read':
      return userPermissions.includes('users.read') || userPermissions.includes('users.read_all');
    case 'write':
      return userPermissions.includes('users.write') || userPermissions.includes('users.write_all');
    case 'delete':
      return userPermissions.includes('users.delete') || userPermissions.includes('users.delete_all');
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
        const permissions = await PermissionDB.getPermissionsForRole(role);
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
