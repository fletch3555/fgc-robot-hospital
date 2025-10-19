import { NextRequest } from "next/server";
import { GET, PATCH } from "../../../src/app/api/requests/[id]/route";
import { Request } from "../../../src/models/Request";
import { query } from "../../../src/lib/database";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
} from "../../helpers/test-utils";

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

describe("/api/requests/[id]", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    const mockContext = { params: Promise.resolve({ id: "test-request-id" }) };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return request when found", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view']); // User has requests view permission

      const mockRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "open",
        country_code: "US",
        country_name: "United States",
        comments: "Test request",
        // priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (Request.findById as jest.Mock).mockResolvedValue(mockRequest);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequest);
      expect(Request.findById).toHaveBeenCalledWith("test-request-id");
    });

    it("should return 404 when request not found", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view']); // User has requests view permission
      (Request.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Request not found" });
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      (Request.findById as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("PATCH", () => {
    const mockContext = { params: Promise.resolve({ id: "test-request-id" }) };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const requestData = { status: "in-progress" };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify(requestData),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should update request successfully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.edit']); // User has requests edit permission

      const updateData = {
        status: "in-progress",
        comments: "Updated comments",
      };

      const mockUpdatedRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "in-progress",
        comments: "Updated comments",
        updated_at: new Date().toISOString(),
      };

      (Request.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedRequest);
      expect(Request.update).toHaveBeenCalledWith("test-request-id", updateData);
    });

    it("should return 404 when updating non-existent request", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.edit']); // User has requests edit permission
      (Request.update as jest.Mock).mockResolvedValue(null);

      const updateData = { status: "in-progress" };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Request not found" });
    });

    it("should handle database errors during update", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.edit']); // User has requests edit permission
      (Request.update as jest.Mock).mockRejectedValue(new Error("Database error"));

      const updateData = { status: "in-progress" };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});