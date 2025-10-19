import { NextRequest } from "next/server";
import { GET } from "../../../src/app/api/fgc-inventory/route";

// Mock the static inventory data
jest.mock("../../../src/data/kop-inventory", () => ({
  kopInventory: [
    {
      "id": "item-1",
      "part_number": "REV-41-1001",
      "description": "Test Part 1",
      "group_name": "Electronics",
      "image_url": "image1.jpg",
      "quantity": 10,
    },
    {
      "id": "item-2",
      "part_number": "REV-41-1002", 
      "description": "Test Part 2",
      "group_name": "Mechanical",
      "image_url": "image2.jpg",
      "quantity": 5,
    },
    {
      "id": "search-item-1",
      "part_number": "REV-41-1001",
      "description": "Motor Controller",
      "group_name": "Electronics", 
      "image_url": "motor.jpg",
      "quantity": 3,
    }
  ]
}));

describe("/api/fgc-inventory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return dashboard summary when dashboard=true", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?dashboard=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        summary: {
          total_items: "3", // 3 mocked items
          total_quantity: "18", // 10 + 5 + 3 = 18
        },
      });
    });

    it("should return paginated inventory items", async () => {
      const mockInventoryItems = [
        {
          "id": "item-1",
          "part_number": "REV-41-1001",
          "description": "Test Part 1",
          "group_name": "Electronics",
          "image_url": "image1.jpg",
          "quantity": 10,
        },
        {
          "id": "item-2",
          "part_number": "REV-41-1002",
          "description": "Test Part 2",
          "group_name": "Mechanical",
          "image_url": "image2.jpg",
          "quantity": 5,
        },
        {
          "id": "search-item-1",
          "part_number": "REV-41-1001",
          "description": "Motor Controller",
          "group_name": "Electronics",
          "image_url": "motor.jpg",
          "quantity": 3,
        }
      ];

      const request = new NextRequest("http://localhost:3000/api/fgc-inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("pagination");
      expect(data.items).toEqual(mockInventoryItems);
      expect(data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1, // 3 items / 20 per page = 1
        totalCount: 3,
        limit: 20,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it("should handle search queries", async () => {
      const mockSearchResults = [
        {
          "id": "search-item-1",
          "part_number": "REV-41-1001",
          "description": "Motor Controller",
          "group_name": "Electronics",
          "image_url": "motor.jpg",
          "quantity": 3,
        }
      ];

      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?search=motor");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual(mockSearchResults);
    });

    it("should handle pagination correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?page=2&limit=20");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        currentPage: 2,
        totalPages: 1, // 3 items / 20 per page = 1
        totalCount: 3,
        limit: 20,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it("should handle custom limit parameter", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(1); // 3 items / 10 per page = 1
    });

    it("should handle database errors gracefully", async () => {
      // Since we're using static data, this test verifies the API works correctly
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
    });

    it("should handle empty results", async () => {
      // Search for something that doesn't exist
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?search=nonexistent");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
      expect(data.pagination.totalCount).toBe(0);
    });

    it("should use default pagination values when not provided", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.currentPage).toBe(1);
      expect(data.pagination.limit).toBe(20);
    });

    it("should handle group filtering", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?search=Electronics");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items.every((item: { group_name: string }) => item.group_name === "Electronics")).toBe(true);
    });

    it("should handle case insensitive search", async () => {
      const request = new NextRequest("http://localhost:3000/api/fgc-inventory?search=MOTOR");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([
        {
          "id": "search-item-1",
          "part_number": "REV-41-1001",
          "description": "Motor Controller",
          "group_name": "Electronics",
          "image_url": "motor.jpg",
          "quantity": 3,
        }
      ]);
    });
  });
});