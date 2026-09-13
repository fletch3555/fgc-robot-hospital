import { NextRequest } from "next/server";
import { GET, PUT, PATCH } from "../../../src/app/api/battery-swaps/[id]/route";
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

const context = { params: Promise.resolve({ id: "swap-1" }) };

describe("/api/battery-swaps/[id]", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps/swap-1"), context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when the swap is not found", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.view"]);
      (BatterySwap.findById as jest.Mock).mockResolvedValue(null);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps/swap-1"), context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Battery swap not found" });
    });

    it("should return the swap when found", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.view"]);
      const mockSwap = { id: "swap-1", country_code: "USA", device_type: "driver_hub", status: "swapped" };
      (BatterySwap.findById as jest.Mock).mockResolvedValue(mockSwap);

      const response = await GET(new NextRequest("http://localhost:3000/api/battery-swaps/swap-1"), context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSwap);
    });
  });

  describe("PUT", () => {
    it("should return 403 when user lacks battery_swaps.edit", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", {
        method: "PUT",
        body: JSON.stringify({ countryCode: "USA" }),
      });

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["battery_swaps.edit"],
        requireAll: true,
        userPermissions: [],
      });
    });

    it("should update the swap when authenticated with valid data", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.edit"]);
      const mockUpdatedSwap = { id: "swap-1", country_code: "CAN", device_type: "driver_hub", status: "swapped" };
      (BatterySwap.update as jest.Mock).mockResolvedValue(mockUpdatedSwap);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", {
        method: "PUT",
        body: JSON.stringify({ countryCode: "CAN", deviceType: "driver_hub" }),
      });

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedSwap);
      expect(BatterySwap.update).toHaveBeenCalledWith(
        "swap-1",
        expect.objectContaining({ countryCode: "CAN", deviceType: "driver_hub" })
      );
    });

    it("should return 404 when updating a swap that does not exist", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.edit"]);
      (BatterySwap.update as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", {
        method: "PUT",
        body: JSON.stringify({ countryCode: "CAN" }),
      });

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Battery swap not found" });
    });
  });

  describe("PATCH", () => {
    it("should return 403 when user lacks battery_swaps.return", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", { method: "PATCH" });

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Insufficient permissions",
        required: ["battery_swaps.return"],
        requireAll: true,
        userPermissions: [],
      });
    });

    it("should mark the swap as returned", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.return"]);
      const mockReturnedSwap = {
        id: "swap-1",
        country_code: "USA",
        device_type: "driver_hub",
        status: "returned",
        handled_by: mockSession.user.id,
      };
      (BatterySwap.markReturned as jest.Mock).mockResolvedValue(mockReturnedSwap);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", { method: "PATCH" });

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockReturnedSwap);
      expect(BatterySwap.markReturned).toHaveBeenCalledWith("swap-1", mockSession.user.id);
    });

    it("should return 404 when returning a swap that does not exist", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(["battery_swaps.return"]);
      (BatterySwap.markReturned as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/battery-swaps/swap-1", { method: "PATCH" });

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Battery swap not found" });
    });
  });
});
