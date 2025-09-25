import { NextRequest } from "next/server";
import { GET } from "../../../src/app/api/dashboard/route";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
} from "../../helpers/test-utils";
import { query } from "../../../src/lib/database";
import { Request } from "../../../src/models/Request";

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRequestFindAll = Request.findAll as jest.MockedFunction<typeof Request.findAll>;

describe("/api/dashboard", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return dashboard data when dashboard=true", async () => {
      setupAuthMock(mockSession);

      // Mock the query responses for request counts
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { status: "open", count: "5" },
            { status: "in-progress", count: "3" },
            { status: "completed", count: "10" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "hw-1",
              type: "hardware",
              status: "open",
              comments: "Hardware issue",
              created_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { status: "open", count: "2" },
            { status: "in-progress", count: "1" },
            { status: "completed", count: "5" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "sw-1",
              type: "software",
              status: "open",
              comments: "Software bug",
              created_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { status: "open", count: "1" },
            { status: "in-progress", count: "2" },
            { status: "completed", count: "3" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "ms-1",
              type: "machine_shop",
              status: "in-progress",
              comments: "Machine shop request",
              created_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { status: "open", count: "3" },
            { status: "in-progress", count: "1" },
            { status: "completed", count: "2" },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "bc-1",
              type: "battery_charging",
              status: "in-progress",
              comments: "Battery charging",
              created_at: new Date().toISOString(),
            },
          ],
        });

      const mockRecentRequests = [
        {
          id: "recent-1",
          type: "hardware" as const,
          status: "open" as const,
          comments: "Recent request",
          country_code: "US",
          priority: "medium" as const,
          submitted_by: "user-1",
          created_at: new Date("2025-10-05T13:47:15.022Z"),
          updated_at: new Date("2025-10-05T13:47:15.022Z"),
        },
      ];

      mockRequestFindAll.mockResolvedValue(mockRecentRequests);

      const request = new NextRequest("http://localhost:3000/api/dashboard?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("hardware");
      expect(data).toHaveProperty("software");
      expect(data).toHaveProperty("machine_shop");
      expect(data).toHaveProperty("battery_charging");
      expect(data).toHaveProperty("recentRequests");

      expect(data.hardware).toHaveProperty("pending");
      expect(data.hardware).toHaveProperty("in_progress");
      expect(data.hardware).toHaveProperty("completed");
      expect(data.hardware).toHaveProperty("requests");

      expect(data.recentRequests).toEqual([
        {
          id: "recent-1",
          type: "hardware",
          status: "open",
          comments: "Recent request",
          country_code: "US",
          priority: "medium",
          submitted_by: "user-1",
          created_at: "2025-10-05T13:47:15.022Z",
          updated_at: "2025-10-05T13:47:15.022Z",
        },
      ]);
    });

    it("should return empty dashboard data when no requests exist", async () => {
      setupAuthMock(mockSession);

      // Mock empty query responses
      mockQuery.mockResolvedValue({ rows: [] });
      mockRequestFindAll.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hardware.pending).toBe(0);
      expect(data.hardware.in_progress).toBe(0);
      expect(data.hardware.completed).toBe(0);
      expect(data.hardware.requests).toEqual([]);
      expect(data.recentRequests).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      mockQuery.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/dashboard?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });

    it("should limit recent requests to 10 items", async () => {
      setupAuthMock(mockSession);

      // Mock queries for request counts (simplified)
      mockQuery.mockResolvedValue({ rows: [] });

      // Create 15 recent requests
      const manyRequests = Array.from({ length: 15 }, (_, i) => ({
        id: `request-${i}`,
        type: "hardware" as const,
        status: "open" as const,
        comments: `Request ${i}`,
        country_code: "US",
        priority: "medium" as const,
        submitted_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockRequestFindAll.mockResolvedValue(manyRequests);

      const request = new NextRequest("http://localhost:3000/api/dashboard?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recentRequests).toHaveLength(10);
    });
  });
});