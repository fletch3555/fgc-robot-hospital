import { NextRequest } from "next/server";
import { GET } from "../../../src/app/api/users/route";
import { User } from "../../../src/models/User";
import { query } from "../../../src/lib/database";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
} from "../../helpers/test-utils";

// Mock database query
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock User model
jest.mock("../../../src/models/User", () => ({
  User: {
    findAll: jest.fn(),
    findByRoles: jest.fn(),
  },
}));

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

describe("/api/users", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return all users when no roles filter is provided", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['users.view']); // User has users view permission

      const mockUsers = [
        {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
        },
        {
          id: "user-2", 
          name: "User Two",
          email: "user2@example.com",
        },
      ];

      (User.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest("http://localhost:3000/api/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
      expect(User.findAll).toHaveBeenCalledTimes(1);
    });

    it("should return filtered users when roles parameter is provided", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['users.view']); // User has users view permission

      const mockFilteredUsers = [
        {
          id: "admin-1",
          name: "Admin User",
          email: "admin@example.com", 
        },
      ];

      (User.findByRoles as jest.Mock).mockResolvedValue(mockFilteredUsers);

      const request = new NextRequest("http://localhost:3000/api/users?roles=admin,lead_robot_inspector");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFilteredUsers);
      expect(User.findByRoles).toHaveBeenCalledWith(["admin", "lead_robot_inspector"]);
    });

    it("should handle single role filter", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['users.view']); // User has users view permission

      const mockFilteredUsers = [
        {
          id: "volunteer-1",
          name: "Volunteer User",
          email: "volunteer@example.com",
        },
      ];

      (User.findByRoles as jest.Mock).mockResolvedValue(mockFilteredUsers);

      const request = new NextRequest("http://localhost:3000/api/users?roles=volunteer");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFilteredUsers);
      expect(User.findByRoles).toHaveBeenCalledWith(["volunteer"]);
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['users.view']); // User has users view permission
      (User.findAll as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });

    it("should sanitize user data to exclude sensitive information", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock(['users.view']); // User has users view permission

      const mockUsersWithSensitiveData = [
        {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
          role: "volunteer",
          password: "hashed-password",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (User.findAll as jest.Mock).mockResolvedValue(mockUsersWithSensitiveData);

      const request = new NextRequest("http://localhost:3000/api/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([
        {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
        },
      ]);
      expect(data[0]).not.toHaveProperty("password");
      expect(data[0]).not.toHaveProperty("createdAt");
      expect(data[0]).not.toHaveProperty("updatedAt");
    });
  });
});