/**
 * Admin Permissions API Tests
 * 
 * Tests for /api/admin/permissions endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "../../../../src/app/api/admin/permissions/route";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
  mockAdminSession,
} from "../../../helpers/test-utils";

// Mock the getAllPermissions function
const mockGetAllPermissions = jest.fn();

jest.mock("../../../../src/lib/authz", () => ({
  ...jest.requireActual("../../../../src/lib/authz"),
  getAllPermissions: (...args: unknown[]) => mockGetAllPermissions(...args),
  checkPermissions: jest.fn(),
}));

// Import the mocked function
import { checkPermissions } from "../../../../src/lib/authz";
const mockCheckPermissions = checkPermissions as jest.MockedFunction<typeof checkPermissions>;

function setupUserPermissionsMock(userPermissions: string[] = [], hasSession: boolean = true) {
  const authorized = userPermissions.includes("admin.permissions");
  
  let response = null;
  if (!authorized) {
    if (!hasSession) {
      // No session = 401 Unauthorized
      response = {
        json: () => Promise.resolve({ error: "Unauthorized" }),
        status: 401
      };
    } else {
      // Has session but lacks permissions = 403 Forbidden
      response = {
        json: () => Promise.resolve({
          error: "Insufficient permissions",
          required: ["admin.permissions"],
          userPermissions,
          requireAll: true
        }),
        status: 403
      };
    }
  }

  mockCheckPermissions.mockResolvedValue({
    authorized,
    response: response as NextResponse<unknown> | null,
    session: authorized ? mockAdminSession : (hasSession ? mockSession : undefined),
    permissions: userPermissions
  });
}

describe("/api/admin/permissions", () => {
  const mockPermissions = [
    {
      name: "requests.view",
      description: "View support requests",
      category: "requests"
    },
    {
      name: "admin.users",
      description: "Manage user accounts",
      category: "admin"
    }
  ];

  beforeEach(() => {
    resetMocks();
    setupAuthMock();
    setupDatabaseMock();
    jest.clearAllMocks();
    mockGetAllPermissions.mockReset();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);
      setupUserPermissionsMock([], false); // No session

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user lacks admin.permissions", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]); // No permissions

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["admin.permissions"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return all permissions for authorized user", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);
      mockGetAllPermissions.mockReturnValueOnce(mockPermissions);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPermissions);
      expect(mockGetAllPermissions).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);
      mockGetAllPermissions.mockImplementationOnce(() => {
        throw new Error("Permissions error");
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch permissions" });
    });
  });

  describe("POST", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);
      setupUserPermissionsMock([], false); // No session

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({ name: "test.permission", category: "test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user lacks admin.permissions", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({ name: "test.permission", category: "test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["admin.permissions"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return 400 when name is missing", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({ category: "test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Name and category are required" });
    });

    it("should return 400 when category is missing", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({ name: "test.permission" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Name and category are required" });
    });

    it("should return 501 for permission creation (not implemented)", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({ name: "test.permission", category: "test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data).toEqual({
        error: "Permission creation not implemented - permissions are predefined"
      });
    });

    it("should handle JSON parsing errors", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(["admin.permissions"]);

      const request = new NextRequest("http://localhost:3000/api/admin/permissions", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create permission" });
    });
  });
});