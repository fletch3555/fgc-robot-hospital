import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "../../../src/app/api/requests/battery-units/route";
import { getBatteryUnits, addBatteryUnit, removeBatteryUnit } from "../../../src/lib/batteryPool";
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

const mockUnits = [
  { device_type: "robot_controller", number: 1, season: 2026, status: "available" },
  { device_type: "robot_controller", number: 2, season: 2026, status: "checked_out", country_code: "USA", country_name: "United States of America" },
];

describe("/api/requests/battery-units", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 403 when user lacks battery_charging.view", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests/battery-units"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_charging.view"]);
    });

    it("should return the unit list for a viewer", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.view"]);
      (getBatteryUnits as jest.Mock).mockResolvedValue(mockUnits);

      const response = await GET(new NextRequest("http://localhost:3000/api/requests/battery-units"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUnits);
    });
  });

  describe("POST", () => {
    it("should return 403 for a user with only battery_charging.edit (not .configure)", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.edit"]);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "POST",
        body: JSON.stringify({ deviceType: "robot_controller", number: 3 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_charging.configure"]);
    });

    it("should add a unit for a user with battery_charging.configure", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.configure"]);
      (addBatteryUnit as jest.Mock).mockResolvedValue(undefined);
      (getBatteryUnits as jest.Mock).mockResolvedValue(mockUnits);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "POST",
        body: JSON.stringify({ deviceType: "robot_controller", number: 3 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockUnits);
      expect(addBatteryUnit).toHaveBeenCalledWith("robot_controller", 3);
    });

    it("should return 400 for a non-positive number", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.configure"]);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "POST",
        body: JSON.stringify({ deviceType: "robot_controller", number: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "number must be a positive integer" });
    });

    it("should return 400 for an invalid device type", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.configure"]);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "POST",
        body: JSON.stringify({ deviceType: "toaster", number: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid device type" });
    });
  });

  describe("DELETE", () => {
    it("should return 403 for a user without battery_charging.configure", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.view"]);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "DELETE",
        body: JSON.stringify({ deviceType: "robot_controller", number: 1 }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.required).toEqual(["battery_charging.configure"]);
    });

    it("should remove a unit for a user with battery_charging.configure", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_charging.configure"]);
      (removeBatteryUnit as jest.Mock).mockResolvedValue(undefined);
      (getBatteryUnits as jest.Mock).mockResolvedValue([mockUnits[1]]);

      const request = new NextRequest("http://localhost:3000/api/requests/battery-units", {
        method: "DELETE",
        body: JSON.stringify({ deviceType: "robot_controller", number: 1 }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockUnits[1]]);
      expect(removeBatteryUnit).toHaveBeenCalledWith("robot_controller", 1);
    });
  });
});
