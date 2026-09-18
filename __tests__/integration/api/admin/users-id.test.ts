import { NextRequest } from "next/server";
import { PUT } from "../../../../src/app/api/admin/users/[id]/route";
import { User } from "../../../../src/models/User";
import { query } from "../../../../src/lib/database";
import {
  setupAuthMock,
  setupDatabaseMock,
  resetMocks,
  mockAdminSession,
} from "../../../helpers/test-utils";

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

const context = { params: Promise.resolve({ id: "user-1" }) };

describe("/api/admin/users/[id] PUT", () => {
  beforeEach(() => {
    resetMocks();
    setupDatabaseMock();
    mockQuery.mockReset();
  });

  it("should return 400 for a non-boolean is_archived value", async () => {
    setupAuthMock(mockAdminSession);
    setupUserPermissionsMock(['admin.users']);
    (User.findById as jest.Mock).mockResolvedValue({ id: "user-1", email: "a@b.com" });

    const request = new NextRequest("http://localhost:3000/api/admin/users/user-1", {
      method: "PUT",
      body: JSON.stringify({ is_archived: "yes" }),
    });

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "is_archived must be a boolean" });
  });

  it("should archive a user", async () => {
    setupAuthMock(mockAdminSession);
    setupUserPermissionsMock(['admin.users']);
    (User.findById as jest.Mock).mockResolvedValue({ id: "user-1", email: "a@b.com" });
    (User.update as jest.Mock).mockResolvedValue({
      id: "user-1",
      name: "Test",
      email: "a@b.com",
      roles: [],
      is_archived: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const request = new NextRequest("http://localhost:3000/api/admin/users/user-1", {
      method: "PUT",
      body: JSON.stringify({ is_archived: true }),
    });

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isArchived).toBe(true);
    expect(User.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ is_archived: true }));
  });
});
