import { NextRequest } from "next/server";
import { GET, PATCH } from "../../../src/app/api/requests/[id]/route";
import { Request } from "../../../src/models/Request";
import { query } from "../../../src/lib/database";
import { reserveBatteryUnit, BatteryUnitConflictError } from "../../../src/lib/batteryPool";
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
    (reserveBatteryUnit as jest.Mock).mockReset().mockResolvedValue(undefined);
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
      // User needs both requests.view (for initial auth) and requests.edit (for update)
      setupUserPermissionsMock(['requests.view', 'requests.edit']);

      const updateData = {
        status: "in-progress",
        comments: "Updated comments",
      };

      const mockExistingRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "open",
        comments: "Original comments",
      };

      const mockUpdatedRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "in-progress",
        comments: "Updated comments",
        updated_at: new Date().toISOString(),
      };

      // Mock the initial findById call to get request type, then the final findById call
      (Request.findById as jest.Mock)
        .mockResolvedValueOnce(mockExistingRequest)
        .mockResolvedValueOnce(mockUpdatedRequest);
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

    it("should reserve the loaner unit when editing a battery_charging request's number", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view', 'battery_charging.edit']);

      const mockExistingRequest = { id: "test-request-id", type: "battery_charging", status: "open", season: 2026 };
      const mockUpdatedRequest = { ...mockExistingRequest };

      (Request.findById as jest.Mock)
        .mockResolvedValueOnce(mockExistingRequest)
        .mockResolvedValueOnce(mockUpdatedRequest);
      (Request.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      const batteryChargingData = { batteryType: "driver_hub", loanerProvided: true, loanerBatteryNumber: 7 };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify({ batteryChargingData }),
      });

      const response = await PATCH(request, mockContext);

      expect(response.status).toBe(200);
      expect(reserveBatteryUnit).toHaveBeenCalledWith(
        expect.anything(), "driver_hub", 7, 2026, "test-request-id"
      );
    });

    it("should return 409 when editing to a loaner unit that's already taken", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view', 'battery_charging.edit']);

      const mockExistingRequest = { id: "test-request-id", type: "battery_charging", status: "open", season: 2026 };
      (Request.findById as jest.Mock).mockResolvedValueOnce(mockExistingRequest);
      (reserveBatteryUnit as jest.Mock).mockRejectedValue(
        new BatteryUnitConflictError("driver_hub #7 is already checked out to another team")
      );

      const batteryChargingData = { batteryType: "driver_hub", loanerProvided: true, loanerBatteryNumber: 7 };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify({ batteryChargingData }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toMatch(/already checked out/);
      expect(Request.update).not.toHaveBeenCalled();
    });

    it("should stamp handled_by server-side when a battery_charging request is marked returned", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view', 'battery_charging.edit']);

      const mockExistingRequest = {
        id: "test-request-id",
        type: "battery_charging",
        status: "open",
      };

      const mockUpdatedRequest = {
        id: "test-request-id",
        type: "battery_charging",
        status: "completed",
        handled_by: mockSession.user.id,
      };

      (Request.findById as jest.Mock)
        .mockResolvedValueOnce(mockExistingRequest)
        .mockResolvedValueOnce(mockUpdatedRequest);
      (Request.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      // Client attempts to smuggle a different handled_by -- must be ignored.
      const updateData = { status: "completed", handled_by: "someone-else-id" };
      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedRequest);
      expect(Request.update).toHaveBeenCalledWith("test-request-id", {
        status: "completed",
        handled_by: mockSession.user.id,
      });
    });

    it("should allow completing a battery_charging return with only battery_charging.return (no .edit)", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view', 'battery_charging.return']);

      const mockExistingRequest = { id: "test-request-id", type: "battery_charging", status: "open" };
      const mockUpdatedRequest = { ...mockExistingRequest, status: "completed", handled_by: mockSession.user.id };

      (Request.findById as jest.Mock)
        .mockResolvedValueOnce(mockExistingRequest)
        .mockResolvedValueOnce(mockUpdatedRequest);
      (Request.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });

      const response = await PATCH(request, mockContext);

      expect(response.status).toBe(200);
    });

    it("should return 403 completing a battery_charging return with neither .edit nor .return", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view']);

      const mockExistingRequest = { id: "test-request-id", type: "battery_charging", status: "open" };
      (Request.findById as jest.Mock).mockResolvedValueOnce(mockExistingRequest);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });

      const response = await PATCH(request, mockContext);

      expect(response.status).toBe(403);
      expect(Request.update).not.toHaveBeenCalled();
    });

    it("should not stamp handled_by for a non-battery_charging request", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view', 'requests.edit']);

      const mockExistingRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "open",
      };
      const mockUpdatedRequest = { ...mockExistingRequest, status: "completed" };

      (Request.findById as jest.Mock)
        .mockResolvedValueOnce(mockExistingRequest)
        .mockResolvedValueOnce(mockUpdatedRequest);
      (Request.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests/test-request-id", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });

      await PATCH(request, mockContext);

      expect(Request.update).toHaveBeenCalledWith("test-request-id", { status: "completed" });
    });

    it("should return 404 when updating non-existent request", async () => {
      setupAuthMock(mockSession);
      // User needs both requests.view (for initial auth) and requests.edit (for update)
      setupUserPermissionsMock(['requests.view', 'requests.edit']);
      
      // Mock the initial findById to return null (request not found)
      (Request.findById as jest.Mock).mockResolvedValue(null);

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
      // User needs both requests.view (for initial auth) and requests.edit (for update)
      setupUserPermissionsMock(['requests.view', 'requests.edit']);
      
      const mockExistingRequest = {
        id: "test-request-id",
        type: "hardware",
        status: "open",
      };
      
      (Request.findById as jest.Mock).mockResolvedValue(mockExistingRequest);
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