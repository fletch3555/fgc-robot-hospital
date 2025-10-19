import { GET } from "../../../../src/app/api/admin/requests/route";
import { Request } from "../../../../src/models/Request";
import { query } from "../../../../src/lib/database";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
  mockAdminSession,
  mockLeadInspectorSession,
} from "../../../helpers/test-utils";

// Mock database query
const mockQuery = query as jest.MockedFunction<typeof query>;

function setupUserPermissionsMock(userPermissions: string[] = []) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT DISTINCT rp.permission_name')) {
      // getUserPermissionNames query
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ permission_name: permission }))
      });
    }
    if (sql.includes('SELECT DISTINCT p.name')) {
      // old getUserPermissionNames query
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ name: permission }))
      });
    }
    // Default to empty results for other queries
    return Promise.resolve({ rows: [] });
  });
}

describe("/api/admin/requests", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
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

    it("should return 403 when user is not admin or lead inspector", async () => {
      setupAuthMock(mockSession); // regular volunteer user
      setupUserPermissionsMock([]); // No admin permissions

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ 
        error: "Insufficient permissions",
        required: ["admin.requests"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return all requests for admin user", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.requests']); // Admin has admin requests permission

      const mockRequests = [
        {
          id: "1",
          type: "hardware",
          status: "open",
          country_code: "US",
          country_name: "United States",
          comments: "Test request",
          // priority: "medium",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          type: "software",
          status: "completed",
          country_code: "CA",
          country_name: "Canada",
          comments: "Completed request",
          // priority: "low",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (Request.findAllForAdmin as jest.Mock).mockResolvedValue(mockRequests);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      expect(Request.findAllForAdmin).toHaveBeenCalledTimes(1);
    });

    it("should return all requests for lead inspector user", async () => {
      setupAuthMock(mockLeadInspectorSession);
      setupUserPermissionsMock(['admin.requests']); // Lead inspector has admin requests permission

      const mockRequests = [
        {
          id: "1",
          type: "hardware",
          status: "in-progress",
          country_code: "US",
          country_name: "United States",
          comments: "Inspector request",
          // priority: "high",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (Request.findAllForAdmin as jest.Mock).mockResolvedValue(mockRequests);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      expect(Request.findAllForAdmin).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.requests']); // Admin has admin requests permission
      (Request.findAllForAdmin as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });

    it("should handle users with undefined role", async () => {
      const sessionWithoutRole = {
        user: {
          id: "user-id",
          name: "User",
          email: "user@example.com",
          // role is undefined
        },
      };
      setupAuthMock(sessionWithoutRole);
      setupUserPermissionsMock([]); // No admin permissions

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ 
        error: "Insufficient permissions",
        required: ["admin.requests"],
        userPermissions: [],
        requireAll: true
      });
    });
  });
});