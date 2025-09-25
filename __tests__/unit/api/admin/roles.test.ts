import { NextRequest } from "next/server";
import { GET, POST } from "../../../../src/app/api/admin/roles/route";
import { query } from "../../../../src/lib/database";
import {
  setupAuthMock,
  resetMocks,
  mockSession,
  mockAdminSession,
} from "../../../helpers/test-utils";

// Mock database query
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock RBAC model
const mockRBACModel = {
  getPermissionsForRole: jest.fn(),
  assignPermissionToRole: jest.fn(),
  removePermissionFromRole: jest.fn(),
};

// jest.mock("../../../../src/models/RBAC", () => ({
//   RBACModel: {
//     getPermissionsForRole: (...args: unknown[]) => mockRBACModel.getPermissionsForRole(...args),
//     assignPermissionToRole: (...args: unknown[]) => mockRBACModel.assignPermissionToRole(...args),
//     removePermissionFromRole: (...args: unknown[]) => mockRBACModel.removePermissionFromRole(...args),
//   },
// }));

const mockPermissions = [
  { id: "perm-1", name: "read_requests", description: "Read requests permission", category: "requests", created_at: "2025-10-16T00:03:30.179Z" },
  { id: "perm-2", name: "write_requests", description: "Write requests permission", category: "requests", created_at: "2025-10-16T00:03:30.179Z" },
];

function setupUserPermissionsMock(userPermissions: string[] = []) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT DISTINCT p.name')) {
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ name: permission }))
      });
    }
    if (sql.includes('SELECT r.*, p.id as permission_id')) {
      return Promise.resolve({
        rows: [
          { role: "admin", display_name: "Administrator", description: "Full system access", color: "#e91e63", is_default: false, permission_id: "perm-1", name: "read_requests", permission_description: "Read requests permission", category: "requests", permission_created_at: "2025-10-16T00:03:30.179Z" },
          { role: "admin", display_name: "Administrator", description: "Full system access", color: "#e91e63", is_default: false, permission_id: "perm-2", name: "write_requests", permission_description: "Write requests permission", category: "requests", permission_created_at: "2025-10-16T00:03:30.179Z" },
          { role: "volunteer", display_name: "Volunteer", description: "Basic user access", color: "#4caf50", is_default: true, permission_id: "perm-1", name: "read_requests", permission_description: "Read requests permission", category: "requests", permission_created_at: "2025-10-16T00:03:30.179Z" },
          { role: "lead_robot_inspector", display_name: "Lead Robot Inspector", description: "Advanced inspection permissions", color: "#607d8b", is_default: false, permission_id: "perm-1", name: "read_requests", permission_description: "Read requests permission", category: "requests", permission_created_at: "2025-10-16T00:03:30.179Z" },
        ]
      });
    }
    if (sql.includes('WHERE rp.role = $1')) {
      // getPermissionsForRole query - return mock permissions
      return Promise.resolve({
        rows: mockPermissions
      });
    }
    return Promise.resolve({ rows: [] });
  });
}

describe("/api/admin/roles", () => {
  beforeEach(() => {
    resetMocks();
    setupAuthMock();
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockRBACModel.getPermissionsForRole.mockReset();
    mockRBACModel.assignPermissionToRole.mockReset();
    mockRBACModel.removePermissionFromRole.mockReset();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user is not admin", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["admin.roles"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return all roles with permissions for admin", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0); // Just check that we get roles back
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);
      
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          return Promise.resolve({
            rows: [{ name: "admin.roles" }]
          });
        }
        // Force error for getRolesWithPermissions query
        throw new Error("Database connection failed");
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch roles" });
    });
  });

  describe("POST", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user is not admin", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock();

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["admin.roles"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return permissions for specified role", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(0);
    });

    it("should return 400 when role is not provided", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Role is required" });
    });

    it("should handle database errors during role permission fetch", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);
      
      // Force query error
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          return Promise.resolve({
            rows: [{ name: "admin.roles" }]
          });
        }
        if (sql.includes('WHERE rp.role = $1')) {
          throw new Error("Database error");
        }
        return Promise.resolve({ rows: [] });
      });

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch role permissions" });
    });

    it("should handle different role types", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.roles"]);

      const request = new NextRequest("http://localhost:3000/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ role: "volunteer" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
