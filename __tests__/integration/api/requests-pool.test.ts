import { NextRequest } from "next/server";
import { GET } from "../../../src/app/api/requests/pool/route";
import { getBatteryPoolStatus } from "../../../src/lib/batteryPool";
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

describe("/api/requests/pool", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 403 when user lacks battery_charging.view", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests/pool"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_charging.view"]);
    });

    it("should return pool status for a viewer", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.view"]);

      const mockPool = [
        { device_type: "robot_controller", season: 2026, total_count: 5, outstanding_count: 2, available_count: 3 },
        { device_type: "driver_hub", season: 2026, total_count: 5, outstanding_count: 0, available_count: 5 },
      ];
      (getBatteryPoolStatus as jest.Mock).mockResolvedValue(mockPool);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests/pool"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPool);
    });
  });
});
