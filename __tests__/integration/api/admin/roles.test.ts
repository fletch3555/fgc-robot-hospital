import { NextRequest } from "next/server";
import { GET, POST } from "../../../../src/app/api/admin/roles/route";
import { query } from "../../../../src/lib/database";
import {
  setupAuthMock,
  resetMocks,
  mockSession,
  mockAdminSession,
} from "../../../helpers/test-utils";
import { PermissionName } from "@/lib/auth-types";

// Mock database query
const mockQuery = query as jest.MockedFunction<typeof query>;

function setupUserPermissionsMock(userPermissions: PermissionName[] = [], forceError = false) {
  mockQuery.mockImplementation((sql: string) => {
    if (
      sql.includes('SELECT DISTINCT rp.permission_name') &&
      sql.includes('FROM role_permissions rp') &&
      sql.includes('JOIN user_roles ur ON rp.role = ur.role_id') &&
      sql.includes('WHERE ur.user_id = $1')
    ) {
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ permission_name: permission }))
      });
    }

    if (forceError &&
      sql.includes('SELECT rp.permission_name FROM role_permissions rp') &&
      sql.includes('WHERE rp.role = $1') &&
      sql.includes('ORDER BY rp.permission_name')
    ) {
      // Force error for getRolesWithPermissions query
      throw new Error("Database connection failed");
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
      setupUserPermissionsMock(["admin.roles"], true);

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
      setupUserPermissionsMock(["admin.roles"], true);

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
