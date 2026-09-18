import { NextRequest } from "next/server";
import { GET, PUT } from "../../../src/app/api/battery-swaps/pool/route";
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

describe("/api/battery-swaps/pool", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 403 when user lacks battery_swaps.view", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps/pool"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_swaps.view"]);
    });

    it("should return pool status for a viewer", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.view"]);

      const mockPool = [
        { device_type: "robot_controller", season: 2026, total_count: 5, outstanding_count: 2, available_count: 3 },
        { device_type: "driver_hub", season: 2026, total_count: 5, outstanding_count: 0, available_count: 5 },
      ];
      (BatterySwap.getPoolStatus as jest.Mock).mockResolvedValue(mockPool);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps/pool"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPool);
    });
  });

  describe("PUT", () => {
    it("should return 403 for a user with only battery_swaps.edit (not .configure)", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.edit"]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/pool", {
        method: "PUT",
        body: JSON.stringify({ deviceType: "robot_controller", totalCount: 5 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_swaps.configure"]);
    });

    it("should update the pool count for a user with battery_swaps.configure", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.configure"]);
      (BatterySwap.setPoolCount as jest.Mock).mockResolvedValue(undefined);
      const mockPool = [
        { device_type: "robot_controller", season: 2026, total_count: 5, outstanding_count: 0, available_count: 5 },
        { device_type: "driver_hub", season: 2026, total_count: 0, outstanding_count: 0, available_count: 0 },
      ];
      (BatterySwap.getPoolStatus as jest.Mock).mockResolvedValue(mockPool);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/pool", {
        method: "PUT",
        body: JSON.stringify({ deviceType: "robot_controller", totalCount: 5 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPool);
      expect(BatterySwap.setPoolCount).toHaveBeenCalledWith("robot_controller", 5);
    });

    it("should return 400 for a negative totalCount", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.configure"]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/pool", {
        method: "PUT",
        body: JSON.stringify({ deviceType: "robot_controller", totalCount: -1 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "totalCount must be a non-negative integer" });
    });
  });
});
