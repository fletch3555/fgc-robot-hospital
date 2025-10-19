import { NextRequest } from "next/server";
import { GET, POST } from "../../../src/app/api/requests/route";
import { Request } from "../../../src/models/Request";
import { User } from "../../../src/models/User";
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

describe("/api/requests", () => {
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

    it("should return requests when user is authenticated", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['hardware.view']); // User has hardware view permission

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
      ];

      (Request.findAll as jest.Mock).mockResolvedValue(mockRequests);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      expect(Request.findAll).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view']); // User has requests view permission
      (Request.findAll as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST", () => {
    const validRequestData = {
      countryCode: "US",
      type: "hardware",
      comments: "New hardware request",
      hardware: {
        type: "troubleshooting",
        location: "hospital",
      },
    };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should create a new request when authenticated with valid data", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create']); // User has requests create permission

      // Mock User.findById to return a valid user
      (User.findById as jest.Mock).mockResolvedValue({
        id: mockSession.user.id,
        name: mockSession.user.name,
        email: mockSession.user.email,
      });

      const mockCreatedRequest = {
        id: "new-request-id",
        ...validRequestData,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (Request.create as jest.Mock).mockResolvedValue(mockCreatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedRequest);
      expect(Request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: "US",
          type: "hardware",
          comments: "New hardware request",
          submittedBy: mockSession.user.id,
        })
      );
    });

    it("should return 400 for missing required fields", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create']); // User has requests create permission

      const invalidData = {
        countryCode: "US",
        // Missing type and comments
      };

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required fields" });
    });

    it("should handle database errors during creation", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create']); // User has requests create permission
      
      // Mock User.findById to return a valid user
      (User.findById as jest.Mock).mockResolvedValue({
        id: mockSession.user.id,
        name: mockSession.user.name,
        email: mockSession.user.email,
      });
      
      (Request.create as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});