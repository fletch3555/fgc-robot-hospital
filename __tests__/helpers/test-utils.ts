import { getCurrentUserWithRoles } from "../../src/lib/supabase/session";
import { connectToDatabase } from "../../src/lib/database";
import { Pool } from "pg";

// Already mocked in jest.setup.js, just import the types here
export const mockGetCurrentUserWithRoles = getCurrentUserWithRoles as jest.MockedFunction<typeof getCurrentUserWithRoles>;
export const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

export const mockSession = {
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    roles: ["volunteer", "spare_parts_attendant"],
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

export const mockAdminSession = {
  user: {
    id: "admin-user-id",
    name: "Admin User",
    email: "admin@example.com",
    roles: ["admin"],
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

export const mockLeadInspectorSession = {
  user: {
    id: "inspector-user-id",
    name: "Lead Inspector",
    email: "inspector@example.com",
    roles: ["lead_robot_inspector"],
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export function setupAuthMock(session: unknown = null) {
  mockGetCurrentUserWithRoles.mockResolvedValue(session as Awaited<ReturnType<typeof getCurrentUserWithRoles>>);
}

export function setupDatabaseMock() {
  const mockPool : Partial<Pool> = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  mockConnectToDatabase.mockResolvedValue(mockPool as Pool);
}

export function resetMocks() {
  jest.clearAllMocks();
}
