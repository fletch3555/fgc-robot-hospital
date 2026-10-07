import { NextRequest } from "next/server";
import { GET, POST } from "../../../src/app/api/requests/route";
import { Request } from "../../../src/models/Request";
import { User } from "../../../src/models/User";
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

describe("/api/requests", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
    (reserveBatteryUnit as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return requests when user is authenticated", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['hardware.view']); // User has hardware view permission

      const mockActiveRequests = [
        {
          id: "1",
          type: "hardware",
          status: "open",
          country_code: "US",
          country_name: "United States",
          comments: "Test request",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockClosedRequests = [
        {
          id: "2",
          type: "hardware",
          status: "closed",
          country_code: "US",
          country_name: "United States",
          comments: "Closed request",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (Request.findAll as jest.Mock).mockResolvedValue(mockActiveRequests);
      (Request.findRecentlyClosed as jest.Mock).mockResolvedValue(mockClosedRequests);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        active: mockActiveRequests,
        closed: mockClosedRequests
      });
      expect(Request.findAll).toHaveBeenCalledTimes(1);
      expect(Request.findRecentlyClosed).toHaveBeenCalledWith(10, undefined);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.view']); // User has requests view permission
      (Request.findAll as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET(new NextRequest("http://localhost:3000/api/requests"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST", () => {
    const validRequestData = {
      countryCode: "USA",
      type: "hardware",
      comments: "New hardware request",
      hardware: {
        type: "troubleshooting",
        location: "hospital",
      },
    };

    it("rejects a country that isn't participating or doesn't exist", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'hardware.create']);

      for (const countryCode of ["NZL", "XXX"]) {
        const request = new NextRequest("http://localhost:3000/api/requests", {
          method: "POST",
          body: JSON.stringify({ ...validRequestData, countryCode }),
          headers: { "Content-Type": "application/json" },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("Invalid country code");
      }
    });

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
      setupUserPermissionsMock(['requests.create', 'hardware.create']); // User has both the broad and type-specific create permission

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
          countryCode: "USA",
          type: "hardware",
          comments: "New hardware request",
          submittedBy: mockSession.user.id,
        })
      );
    });

    it("should return 403 for the broad create permission alone, without the type-specific one", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create']); // no hardware.create

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(Request.create).not.toHaveBeenCalled();
    });

    it("should create a battery_charging request with loanerProvided data", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'battery_charging.create']);

      (User.findById as jest.Mock).mockResolvedValue({
        id: mockSession.user.id,
        name: mockSession.user.name,
        email: mockSession.user.email,
      });

      const batteryChargingData = { batteryType: "robot_controller", loanerProvided: true };
      const mockCreatedRequest = {
        id: "new-battery-request-id",
        countryCode: "USA",
        type: "battery_charging",
        status: "open",
        battery_charging_data: batteryChargingData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (Request.create as jest.Mock).mockResolvedValue(mockCreatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify({
          countryCode: "USA",
          type: "battery_charging",
          batteryChargingData,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedRequest);
      expect(Request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: "USA",
          type: "battery_charging",
          batteryChargingData,
        })
      );
    });

    it("should reserve the loaner unit before creating a request that checks one out", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'battery_charging.create']);
      (User.findById as jest.Mock).mockResolvedValue({ id: mockSession.user.id });

      const batteryChargingData = { batteryType: "robot_controller", loanerProvided: true, loanerBatteryNumber: 3 };
      const mockCreatedRequest = { id: "new-id", type: "battery_charging", battery_charging_data: batteryChargingData };
      (Request.create as jest.Mock).mockResolvedValue(mockCreatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify({ countryCode: "USA", type: "battery_charging", batteryChargingData }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(reserveBatteryUnit).toHaveBeenCalledWith(
        expect.anything(), "robot_controller", 3, expect.any(Number), undefined, undefined, undefined, undefined
      );
    });

    it("should return 409 when the requested loaner unit is already taken", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'battery_charging.create']);
      (User.findById as jest.Mock).mockResolvedValue({ id: mockSession.user.id });
      (reserveBatteryUnit as jest.Mock).mockRejectedValue(
        new BatteryUnitConflictError("robot_controller #3 is already checked out to another team")
      );

      const batteryChargingData = { batteryType: "robot_controller", loanerProvided: true, loanerBatteryNumber: 3 };
      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify({ countryCode: "USA", type: "battery_charging", batteryChargingData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toMatch(/already checked out/);
      expect(Request.create).not.toHaveBeenCalled();
    });

    it("should return 403 when confirming a stale-loan override without battery_charging.return", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'battery_charging.create']); // no .return
      (User.findById as jest.Mock).mockResolvedValue({ id: mockSession.user.id });

      const batteryChargingData = { batteryType: "robot_controller", loanerProvided: true, loanerBatteryNumber: 3 };
      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify({
          countryCode: "USA",
          type: "battery_charging",
          batteryChargingData,
          confirmedSupersedeRequestId: "stale-request-id",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(reserveBatteryUnit).not.toHaveBeenCalled();
      expect(Request.create).not.toHaveBeenCalled();
    });

    it("should pass the confirmed supersede id through to reserveBatteryUnit when authorized", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create', 'battery_charging.create', 'battery_charging.return']);
      (User.findById as jest.Mock).mockResolvedValue({ id: mockSession.user.id });

      const batteryChargingData = { batteryType: "robot_controller", loanerProvided: true, loanerBatteryNumber: 3 };
      const mockCreatedRequest = { id: "new-id", type: "battery_charging", battery_charging_data: batteryChargingData };
      (Request.create as jest.Mock).mockResolvedValue(mockCreatedRequest);

      const request = new NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: JSON.stringify({
          countryCode: "USA",
          type: "battery_charging",
          batteryChargingData,
          confirmedSupersedeRequestId: "stale-request-id",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(reserveBatteryUnit).toHaveBeenCalledWith(
        expect.anything(),
        "robot_controller",
        3,
        expect.any(Number),
        undefined,
        "stale-request-id",
        mockSession.user.id,
        expect.stringContaining("US")
      );
    });

    it("should return 400 for missing required fields", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['requests.create']); // User has requests create permission

      const invalidData = {
        countryCode: "USA",
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
      setupUserPermissionsMock(['requests.create', 'hardware.create']); // User has both the broad and type-specific create permission

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