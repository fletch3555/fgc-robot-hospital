import { NextRequest } from "next/server";
import { GET, POST } from "../../../src/app/api/battery-swaps/route";
import { BatterySwap } from "../../../src/models/BatterySwap";
import { query } from "../../../src/lib/database";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
} from "../../helpers/test-utils";

const mockQuery = query as jest.MockedFunction<typeof query>;

function setupUserPermissionsMock(userPermissions: string[] = []) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT DISTINCT rp.permission_name')) {
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ permission_name: permission }))
      });
    }
    return Promise.resolve({ rows: [] });
  });
}

describe("/api/battery-swaps", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user lacks battery_swaps.view", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["battery_swaps.view"],
        requireAll: true,
        userPermissions: [],
      });
    });

    it("should return swaps filtered by status/deviceType/countryCode", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.view"]);

      const mockSwaps = [
        {
          id: "swap-1",
          country_code: "USA",
          device_type: "driver_hub",
          status: "swapped",
        },
      ];
      (BatterySwap.findAll as jest.Mock).mockResolvedValue(mockSwaps);

      const response = await GET(
        new NextRequest("http://localhost:3000/api/battery-swaps?countryCode=USA&deviceType=driver_hub&status=swapped")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSwaps);
      expect(BatterySwap.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: "USA",
          deviceType: "driver_hub",
          status: "swapped",
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.view"]);
      (BatterySwap.findAll as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });
  });

  describe("POST", () => {
    const validSwapData = {
      countryCode: "USA",
      deviceType: "robot_controller",
      notes: "Team needed a quick swap",
    };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps", {
        method: "POST",
        body: JSON.stringify(validSwapData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user lacks battery_swaps.create", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps", {
        method: "POST",
        body: JSON.stringify(validSwapData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["battery_swaps.create"],
        requireAll: true,
        userPermissions: [],
      });
    });

    it("should return 400 for an invalid country code", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.create"]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps", {
        method: "POST",
        body: JSON.stringify({ ...validSwapData, countryCode: "ZZZ" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid country code" });
    });

    it("should return 400 for an invalid device type", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.create"]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps", {
        method: "POST",
        body: JSON.stringify({ ...validSwapData, deviceType: "some_other_device" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid device type" });
    });

    it("should create a swap when authenticated with valid data", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.create"]);

      const mockCreatedSwap = {
        id: "new-swap-id",
        country_code: "USA",
        device_type: "robot_controller",
        status: "swapped",
      };
      (BatterySwap.create as jest.Mock).mockResolvedValue(mockCreatedSwap);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps", {
        method: "POST",
        body: JSON.stringify(validSwapData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ swap: mockCreatedSwap });
      expect(BatterySwap.create).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: "USA",
          deviceType: "robot_controller",
          submittedBy: mockSession.user.id,
        })
      );
    });
  });
});
