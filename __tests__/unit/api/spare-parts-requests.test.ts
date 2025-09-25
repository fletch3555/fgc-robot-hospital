import { NextRequest } from "next/server";
import { GET, POST } from "../../../src/app/api/spare-parts-requests/route";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
} from "../../helpers/test-utils";

// Mock the query function and country utils
jest.mock("../../../src/lib/database", () => ({
  connectToDatabase: jest.fn(),
  query: jest.fn(),
}));

jest.mock("../../../src/lib/countryUtils", () => ({
  isValidCountryCode: jest.fn(),
  getCountryName: jest.fn(),
}));

// Mock the static inventory data
jest.mock("../../../src/data/kop-inventory", () => ({
  kopInventory: [
    {
      "part_number": "REV-41-1001",
      "description": "Test Part",
      "group_name": "Electronics",
      "image_url": "/images/test-part.jpg",
    },
    {
      "part_number": "fgc-item-1",
      "description": "FGC Test Item",
      "group_name": "Test Group",
      "image_url": "/images/fgc-item.jpg",
    }
  ]
}));

import { query } from "../../../src/lib/database";
import { isValidCountryCode, getCountryName } from "../../../src/lib/countryUtils";

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockIsValidCountryCode = isValidCountryCode as jest.MockedFunction<typeof isValidCountryCode>;
const mockGetCountryName = getCountryName as jest.MockedFunction<typeof getCountryName>;

describe("/api/spare-parts-requests", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockIsValidCountryCode.mockReturnValue(true);
    mockGetCountryName.mockReturnValue("United States");
    mockQuery.mockReset();
  });

  function setupUserPermissionsMock(userPermissions: string[] = []) {
    // Mock the query that gets user permissions
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT DISTINCT p.name')) {
        // This is the getUserPermissionNames query
        return Promise.resolve({
          rows: userPermissions.map(name => ({ name }))
        });
      }
      // For other queries, return the original behavior or mock as needed
      return Promise.resolve({ rows: [] });
    });
  }

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return spare parts requests when authenticated", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.view']); // User has spare parts view permission

      const mockDatabaseRequests = [
        {
          id: "sp-1",
          country_code: "US",
          requested_quantity: 2,
          requested_by: "test-user-id",
          requested_by_name: "Test User",
          requested_by_email: "test@example.com",
          fgc_part_number: "REV-41-1001",
          requested_at: new Date().toISOString(),
        },
      ];

      // Expected enhanced response after inventory lookup
      const expectedEnhancedRequests = [
        {
          id: "sp-1",
          country_code: "US",
          country_name: "United States",
          requested_quantity: 2,
          requested_by: "test-user-id",
          requested_by_name: "Test User",
          requested_by_email: "test@example.com",
          fgc_part_number: "REV-41-1001",
          part_number: "REV-41-1001",
          item_description: "Test Part",
          group_name: "Electronics",
          image_url: "/images/test-part.jpg",
          requested_at: mockDatabaseRequests[0].requested_at,
        },
      ];

      // Setup the query mock to handle both permission check and data retrieval
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          // Permission check query
          return Promise.resolve({
            rows: [{ name: 'spare_parts.view' }]
          });
        }
        // Data retrieval query
        return Promise.resolve({ rows: mockDatabaseRequests });
      });

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expectedEnhancedRequests);
    });

    it("should return dashboard data when dashboard=true", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.view']); // User has spare parts view permission

      const mockDashboardData = {
        counts: {
          pending: 5,
          issued: 3,
          returned: 1,
          denied: 0,
        },
        overdueLoans: [
          {
            _id: "loan-1",
            partName: "Test Part",
            countryCode: "US",
            countryName: "United States",
            dueDate: new Date(),
          },
        ],
      };

      // Setup mock for permission check and dashboard queries
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          // Permission check query
          return Promise.resolve({
            rows: [{ name: 'spare_parts.view' }]
          });
        }
        if (sql.includes("SELECT 'pending' as status") || sql.includes('UNION ALL')) {
          // Dashboard counts query
          return Promise.resolve({
            rows: [
              { status: "pending", count: "5" },
              { status: "issued", count: "3" },
              { status: "returned", count: "0" },
              { status: "denied", count: "0" },
            ],
          });
        }
        if (sql.includes('issued_at IS NOT NULL LIMIT 0')) {
          // Overdue loans query
          return Promise.resolve({
            rows: mockDashboardData.overdueLoans,
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("counts");
      expect(data).toHaveProperty("overdueLoans");
      expect(data.counts.pending).toBe(5);
      expect(data.counts.issued).toBe(3);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.view']); // User has spare parts view permission
      
      // Mock permission check success, then database error
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          // Permission check query succeeds
          return Promise.resolve({
            rows: [{ name: 'spare_parts.view' }]
          });
        }
        // Other queries fail
        return Promise.reject(new Error("Database error"));
      });

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST", () => {
    const validRequestData = {
      requestedItems: [
        {
          fgcInventoryId: "fgc-item-1",
          requestedQuantity: 2,
        },
      ],
      countryCode: "US",
      notes: "Need these parts urgently",
    };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should create spare parts requests when authenticated with valid data", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.create']); // User has spare parts create permission

      // Mock the INSERT query for creating the request
      const mockCreatedRequest = {
        id: "new-request-id",
        fgc_part_number: "fgc-item-1",
        country_code: "US",
        requested_quantity: 2,
        requested_by: "test-user-id",
        notes: ["Need these parts urgently"],
        requested_at: new Date().toISOString(),
      };

      // Setup mock for permission check and insert query
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT DISTINCT p.name')) {
          // Permission check query
          return Promise.resolve({
            rows: [{ name: 'spare_parts.create' }]
          });
        }
        if (sql.includes('INSERT INTO spare_parts_requests')) {
          // Insert query
          return Promise.resolve({
            rows: [mockCreatedRequest],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("message", "Spare parts requests created successfully");
      expect(data).toHaveProperty("requests");
      expect(data.requests).toHaveLength(1);
      expect(data.requests[0]).toEqual(mockCreatedRequest);
      
      // Check the actual SQL query that was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO spare_parts_requests"),
        [
          "fgc-item-1",  // fgcInventoryId
          "US",          // countryCode (uppercase)
          2,             // requestedQuantity
          "test-user-id", // session.user.id
          ["Need these parts urgently"] // notes array
        ]
      );
    });

    it("should return 400 when no items are requested", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.create']); // User has permission

      const invalidData = {
        requestedItems: [],
        countryCode: "US",
        notes: "No items",
      };

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "At least one item is required" });
    });

    it("should return 400 when country code is invalid", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.create']); // User has permission
      mockIsValidCountryCode.mockReturnValue(false);

      const invalidData = {
        requestedItems: [{ fgcInventoryId: "fgc-item-1", requestedQuantity: 1 }],
        countryCode: "INVALID",
        notes: "Test",
      };

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid country code" });
    });

    it("should return 400 when requested items not found in inventory", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.create']); // User has permission

      const invalidData = {
        requestedItems: [{ fgcInventoryId: "invalid-part", requestedQuantity: 1 }],
        countryCode: "US",
        notes: "Test",
      };

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ 
        error: "The following part numbers were not found in FGC inventory: invalid-part"
      });
    });

    it("should handle database errors during creation", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['spare_parts.create']);
      mockQuery.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/spare-parts-requests", {
        method: "POST",
        body: JSON.stringify(validRequestData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});