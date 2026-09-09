import { NextRequest } from "next/server";
import { GET, POST } from "../../../../src/app/api/admin/users/route";
import { User } from "../../../../src/models/User";
import { query } from "../../../../src/lib/database";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockSession,
  mockAdminSession,
} from "../../../helpers/test-utils";

jest.mock("../../../../src/lib/supabase/admin");

// Mock database query
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;
const mockCreateUser = jest.fn();
const mockDeleteUser = jest.fn();

function setupUserPermissionsMock(userPermissions: string[] = []) {
  mockQuery.mockImplementation((sql: string) => {
    if (
      sql.includes('SELECT DISTINCT rp.permission_name') &&
      sql.includes('FROM role_permissions rp') &&
      sql.includes('JOIN user_roles ur ON rp.role = ur.role_id') &&
      sql.includes('WHERE ur.user_id = $1')
    ) {
      return Promise.resolve({
        rows: userPermissions.map(permission => ({ permission_name: permission }))
      });
    }
    // Default to empty results for other queries
    return Promise.resolve({ rows: [] });
  });
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
    mockCreateUser.mockReset();
    mockDeleteUser.mockReset();
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user is not admin", async () => {
      setupAuthMock(mockSession); // regular volunteer user
      setupUserPermissionsMock([]); // No admin permissions

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ 
        error: "Insufficient permissions",
        required: ["admin.users"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should return all users for admin", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.users']); // Admin has admin users permission

      const mockUsers = [
        {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
          role: "volunteer",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "user-2",
          name: "User Two",
          email: "user2@example.com",
          role: "admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (User.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("users");
      expect(data).toHaveProperty("pagination");
      expect(data.users).toHaveLength(2);
      expect(data.users[0]).toEqual({
        _id: "user-1",
        name: "User One",
        email: "user1@example.com",
        createdAt: mockUsers[0].created_at,
        updatedAt: mockUsers[0].updated_at,
      });
      expect(data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 2,
        pages: 1,
      });
    });

    it("should handle database errors gracefully", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.users']); // Admin has admin users permission
      (User.findAll as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });
  });

  describe("POST", () => {
    const validUserData = {
      name: "New User",
      email: "newuser@example.com",
      roles: ["volunteer"],
      password: "password123",
    };

    it("should return 401 when user is not authenticated", async () => {
      setupAuthMock(null);

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validUserData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when user is not admin", async () => {
      setupAuthMock(mockSession);
      setupUserPermissionsMock([]); // No admin permissions

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validUserData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ 
        error: "Insufficient permissions",
        required: ["admin.users"],
        userPermissions: [],
        requireAll: true
      });
    });

    it("should create a new user when authenticated as admin", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.users']); // Admin has admin users permission

      const mockCreatedUser = {
        id: "new-user-id",
        name: "New User",
        email: "newuser@example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockCreateUser.mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null });
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validUserData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        _id: mockCreatedUser.id,
        name: mockCreatedUser.name,
        email: mockCreatedUser.email,
        createdAt: mockCreatedUser.created_at,
        updatedAt: mockCreatedUser.updated_at,
      });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New User",
          email: "newuser@example.com",
          roles: ["volunteer"],
        })
      );
    });

    it("should return 400 for missing required fields", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.users']); // Admin has admin users permission

      const invalidData = {
        name: "New User",
        // Missing email, role, and password
      };

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required fields" });
    });

    it("should handle database errors during user creation", async () => {
      setupAuthMock(mockAdminSession);
      setupUserPermissionsMock(['admin.users']); // Admin has admin users permission
      mockCreateUser.mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null });
      mockDeleteUser.mockResolvedValue({ error: null });
      (User.create as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validUserData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });
  });
});