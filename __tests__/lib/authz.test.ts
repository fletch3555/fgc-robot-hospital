/**
 * Authorization Module Tests - lib/authz.ts
 * 
 * Comprehensive tests for the authorization module including
 * permission checking, role validation, and database operations.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Session } from "next-auth";
import {
  checkPermissions,
  checkRoles,
  requireAdmin,
  hasPermission,
  getUserPermissions,
  PermissionDB,
  getRolesWithPermissions
} from "../../src/lib/authz";
import { query } from "../../src/lib/database";
import {
  setupDatabaseMock,
} from "../helpers/test-utils";

// Type definitions for testing

// Mock dependencies
jest.mock("next-auth/next");
jest.mock("../../src/lib/database");
jest.mock("next/server");

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
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
    id: "perm-1",
    name: "requests.view",
    description: "View requests",
    category: "requests",
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "perm-2",
    name: "admin.users",
    description: "Manage users",
    category: "admin", 
    created_at: "2024-01-01T00:00:00Z"
  }
];

describe("Authorization Module", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupDatabaseMock();
    
    // Setup default successful database responses
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      // Handle getUserPermissionNames - JOIN permissions with role_permissions and user_roles
      if (sql.includes('DISTINCT p.name') && sql.includes('user_roles ur')) {
        return Promise.resolve({
          rows: [
            { name: 'requests.view' },
            { name: 'requests.create' }
          ]
        });
      }
      
      // Handle userHasPermission - returns boolean
      if (sql.includes('has_permission') || sql.includes('user_has_permission')) {
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
      
      // Handle getPermissionsForRole - SELECT p.* FROM permissions p JOIN role_permissions rp
      if (sql.includes('SELECT p.*') && sql.includes('role_permissions rp')) {
        return Promise.resolve({
          rows: [
            { 
              id: 'perm-1',
              name: 'requests.view', 
              description: 'View requests',
              category: 'requests',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        });
      }
      
      // Handle roleHasPermission - SELECT 1 FROM role_permissions rp JOIN permissions p
      if (sql.includes('SELECT 1 FROM role_permissions rp')) {
        const role = params?.[0] || '';
        const permission = params?.[1] || '';
        // Admin role has admin.users, guest role does not
        if (permission === 'admin.users') {
          return Promise.resolve({
            rows: role === 'admin' ? [{ id: 1 }] : []
          });
        }
        return Promise.resolve({
          rows: [{ id: 1 }] // Any rows mean the role has permission
        });
      }
      
      // Handle getAllPermissions
      if (sql.includes('permissions') && sql.includes('ORDER BY')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'requests.view', description: 'View requests' },
            { id: 2, name: 'requests.create', description: 'Create requests' },
            { id: 3, name: 'admin.users', description: 'Manage users' }
          ]
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

  describe("checkPermissions", () => {
    it("should return unauthorized when no session", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return unauthorized when no user ID", async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: null, expires: "" } as unknown as Session);

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should authorize admin users for any permission", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession as Session);

      const result = await checkPermissions(["any.permission"]);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
      expect(result.session).toEqual(mockAdminSession);
      expect(result.permissions).toEqual(["*"]);
    });

    it("should check user permissions when requireAll is true (default)", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "requests.view" }, { name: "requests.create" }]
      });

      const result = await checkPermissions(["requests.view", "requests.create"]);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
      expect(result.session).toEqual(mockSession);
    });

    it("should check user permissions when requireAll is false", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "requests.view" }]
      });

      const result = await checkPermissions(["requests.view", "admin.users"], false);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
    });

    it("should return insufficient permissions when user lacks required permissions (requireAll=true)", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "requests.view" }]
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
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "other.permission" }]
      });

      const result = await checkPermissions(["requests.view", "admin.users"], false);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient permissions",
          required: ["requests.view", "admin.users"],
          requireAll: false,
          userPermissions: ["other.permission"]
        },
        { status: 403 }
      );
    });

    it("should handle database errors gracefully", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const result = await checkPermissions(["requests.view"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Internal server error" },
        { status: 500 }
      );
    });
  });

  describe("checkRoles", () => {
    it("should return unauthorized when no session", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await checkRoles(["admin"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should authorize user with required role (requireAll=false, default)", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession as Session);

      const result = await checkRoles(["admin", "guest"]);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
      expect(result.session).toEqual(mockAdminSession);
    });

    it("should authorize user with all required roles (requireAll=true)", async () => {
      const userWithMultipleRoles = {
        ...mockSession,
        user: { ...mockSession.user, roles: ["admin", "guest"] }
      };
      mockGetServerSession.mockResolvedValueOnce(userWithMultipleRoles as Session);

      const result = await checkRoles(["admin", "guest"], true);

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
    });

    it("should return insufficient role permissions when user lacks required roles", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const result = await checkRoles(["admin"]);

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient role permissions",
          required: ["admin"],
          requireAll: false,
          userRoles: ["guest"]
        },
        { status: 403 }
      );
    });

    it("should handle missing user roles gracefully", async () => {
      const sessionWithoutRoles = {
        ...mockSession,
        user: { ...mockSession.user, roles: undefined }
      };
      mockGetServerSession.mockResolvedValueOnce(sessionWithoutRoles as unknown as Session);

      const result = await checkRoles(["admin"]);

      expect(result.authorized).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("should authorize admin users", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession as Session);

      const result = await requireAdmin();

      expect(result.authorized).toBe(true);
      expect(result.response).toBe(null);
    });

    it("should reject non-admin users", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const result = await requireAdmin();

      expect(result.authorized).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient role permissions",
          required: ["admin"],
          requireAll: false,
          userRoles: ["guest"]
        },
        { status: 403 }
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
        rows: [{ name: "requests.view" }, { name: "requests.create" }]
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
      // Mock the PermissionDB.getPermissionsForRole calls for multiple roles
      const mockGetPermissions = jest.spyOn(PermissionDB, 'getPermissionsForRole');
      
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

      expect(result).toHaveLength(9); // Should return all 9 roles
      expect(result.find(r => r.role === 'guest')).toMatchObject({
        role: 'guest',
        displayName: 'Guest',
        permissions: [mockPermissions[0]]
      });
    });

    it("should handle errors gracefully", async () => {
      jest.spyOn(PermissionDB, 'getPermissionsForRole')
        .mockRejectedValue(new Error("Permission fetch failed"));

      await expect(getRolesWithPermissions()).rejects.toThrow("Permission fetch failed");
    });
  });
});

describe("PermissionDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // This will remove any spies
    setupDatabaseMock(); // Re-setup the database mock
  });

  describe("getAllPermissions", () => {
    it("should fetch all permissions ordered by category and name", async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await PermissionDB.getAllPermissions();

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM permissions ORDER BY category, name",
        []
      );
      expect(result).toEqual(mockPermissions);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      await expect(PermissionDB.getAllPermissions()).rejects.toThrow("Database error");
    });
  });

  describe("getPermissionsForRole", () => {
    it("should fetch permissions for a specific role", async () => {
      // The parameter-aware mock will handle this automatically
      const result = await PermissionDB.getPermissionsForRole("guest" as Role);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("JOIN role_permissions rp"),
        ["guest"]
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getUserPermissionNames", () => {
    it("should return permission names for a user", async () => {
      // The parameter-aware mock is already set up in beforeEach to return
      // ['requests.view', 'requests.create'] for getUserPermissionNames
      
      const result = await PermissionDB.getUserPermissionNames("user-123");

      expect(result).toEqual(["requests.view", "requests.create"]);
    });
  });

  describe("userHasPermission", () => {
    it("should return true when user has permission", async () => {
      // The parameter-aware mock will return true for requests.view
      const result = await PermissionDB.userHasPermission("user-123", "requests.view");

      expect(result).toBe(true);
    });

    it("should return false when user lacks permission", async () => {
      // The parameter-aware mock will return false for admin.users for non-admin users
      const result = await PermissionDB.userHasPermission("user-123", "admin.users");

      expect(result).toBe(false);
    });
  });

  describe("roleHasPermission", () => {
    it("should return true when role has permission", async () => {
      // Mock permission exists for role (roleHasPermission checks rows.length > 0)
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1 }] // Any row means permission exists
      });

      const result = await PermissionDB.roleHasPermission("admin" as Role, "admin.users");

      expect(result).toBe(true);
    });

    it("should return false when role lacks permission", async () => {
      // Mock no permission for role (empty rows array)
      mockQuery.mockResolvedValueOnce({ 
        rows: [] // No rows means no permission
      });

      const result = await PermissionDB.roleHasPermission("guest" as Role, "admin.users");

      expect(result).toBe(false);
    });
  });

  describe("grantPermissionToRole", () => {
    it("should grant permission to role", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PermissionDB.grantPermissionToRole("guest" as Role, "perm-123");

      expect(mockQuery).toHaveBeenCalledWith(
        "INSERT INTO role_permissions (role, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        ["guest", "perm-123"]
      );
    });
  });

  describe("revokePermissionFromRole", () => {
    it("should revoke permission from role", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PermissionDB.revokePermissionFromRole("guest" as Role, "perm-123");

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM role_permissions WHERE role = $1 AND permission_id = $2",
        ["guest", "perm-123"]
      );
    });
  });
});