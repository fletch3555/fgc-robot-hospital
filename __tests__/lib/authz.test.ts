/**
 * Authorization Module Tests - lib/authz.ts
 * 
 * Comprehensive tests for the authorization module including
 * permission checking, role validation, and database operations.
 */

import { NextResponse } from "next/server";
import { getCurrentUserWithRoles } from "../../src/lib/supabase/session";
import {
  checkPermissions,
  hasPermission,
  getUserPermissions,
  PermissionRegistry,
  RolePermissionService,
  UserAuthorizationService,
  getRolesWithPermissions,
  PERMISSIONS
} from "../../src/lib/authz";
import { query } from "../../src/lib/database";
import {
  setupDatabaseMock,
} from "../helpers/test-utils";
import { Permission, Role } from "@/lib/auth-types";

// Type definitions for testing

// Mock dependencies
jest.mock("../../src/lib/supabase/session");
jest.mock("../../src/lib/database");
jest.mock("next/server");

const mockGetCurrentUserWithRoles = getCurrentUserWithRoles as jest.MockedFunction<typeof getCurrentUserWithRoles>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;

// Mock data
const mockSession = {
  user: {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    roles: ["guest"]
  },
  expires: "2025-12-31"
};

const mockAdminSession = {
  user: {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    roles: ["admin"]
  },
  expires: "2025-12-31"
};

const mockPermissions: Permission[] = [
  {
    name: "requests.view",
    description: "View requests",
    category: "requests",
  },
  {
    name: "admin.users",
    description: "Manage users",
    category: "admin", 
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  setupDatabaseMock();
  
  // Setup default successful database responses
  mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
    // Handle getUserPermissionNames - SELECT DISTINCT rp.permission_name FROM role_permissions rp JOIN user_roles ur
    if (
      sql.includes('SELECT DISTINCT rp.permission_name') &&
      sql.includes('FROM role_permissions rp') &&
      sql.includes('JOIN user_roles ur ON rp.role = ur.role_id') &&
      sql.includes('WHERE ur.user_id = $1')
    ) {
      return Promise.resolve({
        rows: [
          { permission_name: 'requests.view' },
          { permission_name: 'requests.create' }
        ]
      });
    }
    
    // Handle userHasPermission - SELECT EXISTS(SELECT 1 FROM role_permissions rp JOIN user_roles ur [...]) as has_permission
    if (
      sql.includes('SELECT 1 FROM role_permissions rp') && 
      sql.includes('JOIN user_roles ur ON rp.role = ur.role_id') &&
      sql.includes('WHERE ur.user_id = $1 AND rp.permission_name = $2')
    ) {
      // Check the permission being tested
      const permission = params?.[1] || '';
      if (permission === 'admin.users') {
        // Admin role should have admin.users, guest should not
        const userId = params?.[0] || '';
        return Promise.resolve({
          rows: [{ has_permission: userId === 'admin-123' }]
        });
      }
      return Promise.resolve({
        rows: [{ has_permission: true }]
      });
    }
    
    // Handle roleHasPermission - SELECT EXISTS(SELECT 1 FROM role_permissions rp [...]) as has_permission
    if (
      sql.includes('SELECT 1 FROM role_permissions rp') &&
      sql.includes('WHERE rp.role = $1 AND rp.permission_name = $2')
    ) {
      const role = params?.[0] || '';
      const permission = params?.[1] || '';
      // Admin role has admin.users, guest role does not
      if (permission === 'admin.users') {
        return Promise.resolve({
          rows: role === 'admin' ? [{ has_permission: true }] : []
        });
      }
      return Promise.resolve({
        rows: [{ has_permission: true }] // Any rows mean the role has permission
      });
    }

    return Promise.resolve({ rows: [] });
  });
  
  // Mock NextResponse.json
  mockNextResponse.json = jest.fn().mockImplementation((data, init) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200
  })) as unknown as typeof mockNextResponse.json;
});

describe("Authorization Module", () => {
  describe("checkPermissions", () => {
    it("should return unauthorized when no session", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return unauthorized when no user ID", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce({ user: { id: "", email: "", name: "", roles: [] }, expires: "" });

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should authorize admin users for any permission", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockAdminSession);

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
      expect(result.session).toEqual(mockAdminSession);
      expect(result.permissions).toEqual(['requests.view', 'requests.create']);
    });

    it("should check user permissions when requireAll is true (default)", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);
      mockQuery.mockResolvedValueOnce({
        rows: [{ permission_name: "requests.view" }, { permission_name: "requests.create" }]
      });

      const result = await checkPermissions(["requests.view", "requests.create"]);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
      expect(result.session).toEqual(mockSession);
    });

    it("should check user permissions when requireAll is false", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);
      mockQuery.mockResolvedValueOnce({
        rows: [{ permission_name: "requests.view" }]
      });

      const result = await checkPermissions(["requests.view", "admin.users"], false);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
    });

    it("should return insufficient permissions when user lacks required permissions (requireAll=true)", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);
      mockQuery.mockResolvedValueOnce({
        rows: [{ permission_name: "requests.view" }]
      });

      const result = await checkPermissions(["requests.view", "admin.users"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient permissions",
          required: ["requests.view", "admin.users"],
          requireAll: true,
          userPermissions: ["requests.view"]
        },
        { status: 403 }
      );
    });

    it("should return insufficient permissions when user lacks any required permissions (requireAll=false)", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);
      mockQuery.mockResolvedValueOnce({
        rows: [{ permission_name: "requests.edit" }]
      });

      const result = await checkPermissions(["requests.view", "admin.users"], false);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient permissions",
          required: ["requests.view", "admin.users"],
          requireAll: false,
          userPermissions: ["requests.edit"]
        },
        { status: 403 }
      );
    });

    it("should handle database errors gracefully", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Internal server error" },
        { status: 500 }
      );
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has permission", async () => {
      // Mock the actual userHasPermission call with correct response format
      mockQuery.mockResolvedValueOnce({
        rows: [{ has_permission: true }]
      });

      const result = await hasPermission("user-123", "requests.view");

      expect(result).toBe(true);
    });

    it("should return false when user lacks permission", async () => {
      // Mock userHasPermission to return false
      mockQuery.mockResolvedValueOnce({
        rows: [{ has_permission: false }]
      });

      const result = await hasPermission("user-123", "admin.users");

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const result = await hasPermission("user-123", "requests.view");

      expect(result).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("should return user permission names", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ permission_name: "requests.view" }, { permission_name: "requests.create" }]
      });

      const result = await getUserPermissions("user-123");

      expect(result).toEqual(["requests.view", "requests.create"]);
    });

    it("should return empty array on database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const result = await getUserPermissions("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getRolesWithPermissions", () => {
    it("should return roles with their permissions", async () => {
      // Mock the RolePermissionService.getPermissionsForRole calls for multiple roles
      const mockGetPermissions = jest.spyOn(RolePermissionService, 'getPermissionsForRole');
      
      // Setup mocks for all 9 roles
      mockGetPermissions.mockImplementation((role: Role) => {
        if (role === 'guest') {
          return Promise.resolve([mockPermissions[0]]);
        }
        if (role === 'admin') {
          return Promise.resolve([mockPermissions[1]]);
        }
        // Default permissions for other roles
        return Promise.resolve([
          { 
            id: '1', 
            name: 'requests.view', 
            description: 'View requests', 
            category: 'requests', 
            created_at: '2023-01-01T00:00:00Z' 
          },
          { 
            id: '2', 
            name: 'requests.create', 
            description: 'Create requests', 
            category: 'requests', 
            created_at: '2023-01-01T00:00:00Z' 
          }
        ]);
      });

      const result = await getRolesWithPermissions();

      expect(result).toHaveLength(7); // Should return all 7 roles
      expect(result.find(r => r.role === 'guest')).toMatchObject({
        role: 'guest',
        displayName: 'Guest',
        permissions: [mockPermissions[0]]
      });
    });

    it("should handle errors gracefully", async () => {
      jest.spyOn(RolePermissionService, 'getPermissionsForRole')
        .mockRejectedValue(new Error("Permission fetch failed"));

      await expect(getRolesWithPermissions()).rejects.toThrow("Permission fetch failed");
    });
  });
});

describe("Permission Services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // This will remove any spies
    setupDatabaseMock(); // Re-setup the database mock
  });

  describe("PermissionRegistry", () => {
    it("should return all code-based permissions in database-compatible format", async () => {
      const result = await PermissionRegistry.getAllPermissions();

      // Should return all permissions
      expect(result).toHaveLength(Object.keys(PERMISSIONS).length); // We have 46 permissions
      
      // Should have database-compatible format
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('category');
    });

    it("should include all expected permission categories", async () => {
      const result = PermissionRegistry.getPermissionsByCategory();
      
      const categories = Object.keys(result);
      expect(categories).toContain('requests');
      expect(categories).toContain('hardware');
      expect(categories).toContain('software');
      expect(categories).toContain('machine_shop');
      expect(categories).toContain('spare_parts');
      // expect(categories).toContain('inspection');
      expect(categories).toContain('admin');
      expect(categories).toContain('documentation');
      expect(categories).toContain('inventory');
      expect(categories).toContain('matches');
    });
  });

  describe("getPermissionsForRole", () => {
    it("should fetch permissions for a specific role", async () => {
      // The parameter-aware mock will handle this automatically
      const result = await RolePermissionService.getPermissionsForRole("guest" as Role);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT rp.permission_name FROM role_permissions rp"),
        ["guest"]
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getUserPermissionNames", () => {
    it("should return permission names for a user", async () => {
      // The parameter-aware mock is already set up in beforeEach to return
      // ['requests.view', 'requests.create'] for getUserPermissionNames
      
      const result = await UserAuthorizationService.getUserPermissionNames("user-123");

      expect(result).toEqual(["requests.view", "requests.create"]);
    });
  });

  describe("userHasPermission", () => {
    it("should return true when user has permission", async () => {
      // The parameter-aware mock will return true for requests.view
      mockQuery.mockResolvedValue({
        rows: [{ has_permission: true }]
      });
      
      const result = await UserAuthorizationService.userHasPermission("user-123", "requests.view");

      expect(result).toBe(true);
    });

    it("should return false when user lacks permission", async () => {
      // The parameter-aware mock will return false for admin.users for non-admin users
      
      const result = await UserAuthorizationService.userHasPermission("user-123", "admin.users");

      expect(result).toBe(false);
    });
  });

  describe("roleHasPermission", () => {
    it("should return true when role has permission", async () => {
      // Mock permission exists for role (roleHasPermission checks rows.length > 0)
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ has_permission: true }]
      });

      const result = await RolePermissionService.roleHasPermission("admin" as Role, "admin.users");

      expect(result).toBe(true);
    });

    it("should return false when role lacks permission", async () => {
      // Mock no permission for role (empty rows array)
      mockQuery.mockResolvedValueOnce({ 
        rows: [] // No rows means no permission
      });

      const result = await RolePermissionService.roleHasPermission("guest" as Role, "admin.users");

      expect(result).toBe(false);
    });
  });

  describe("grantPermissionToRole", () => {
    it("should grant permission to role", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await RolePermissionService.grantPermissionToRole("guest" as Role, "requests.view");

      expect(mockQuery).toHaveBeenCalledWith(
        "INSERT INTO role_permissions (role, permission_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        ["guest", "requests.view"]
      );
    });
  });

  describe("revokePermissionFromRole", () => {
    it("should revoke permission from role", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await RolePermissionService.revokePermissionFromRole("guest" as Role, "requests.view");

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM role_permissions WHERE role = $1 AND permission_name = $2",
        ["guest", "requests.view"]
      );
    });
  });
});