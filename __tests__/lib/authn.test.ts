/**
 * Authentication Module Tests - lib/authn.ts
 *
 * Tests for the unified authentication module covering
 * session management, authentication guards, and utilities.
 */

import { NextResponse } from "next/server";
import { getCurrentUserWithRoles } from "@/lib/supabase/session";
import {
  getAuthenticatedSession,
  requireAuthentication,
  createAuthGuard,
  hasValidSession,
  getAuthenticatedUser,
} from "@/lib/authn";
import type { AppSession } from "@/lib/auth-types";

// Type definitions for testing
type MockResponse = {
  json: () => Promise<unknown>;
  status: number;
};
type MockNextResponseStatic = {
  json: jest.MockedFunction<(data: unknown, init?: { status?: number }) => MockResponse>;
};

// Mock dependencies
jest.mock("@/lib/supabase/session");
jest.mock("next/server");

const mockGetCurrentUserWithRoles = getCurrentUserWithRoles as jest.MockedFunction<typeof getCurrentUserWithRoles>;
const mockNextResponse = NextResponse as unknown as MockNextResponseStatic;

describe("Authentication Module - lib/authn.ts", () => {
  // Mock data
  const mockSession: AppSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      roles: ["guest"]
    },
    expires: "2025-12-31"
  };

  const mockAdminSession: AppSession = {
    user: {
      id: "admin-123",
      email: "admin@example.com",
      name: "Admin User",
      roles: ["admin"]
    },
    expires: "2025-12-31"
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NextResponse.json
    mockNextResponse.json = jest.fn().mockImplementation((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200
    }));
  });

  describe("getAuthenticatedSession", () => {
    it("should return session for authenticated user", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

      const result = await getAuthenticatedSession();

      expect(result).toEqual(mockSession);
    });

    it("should return null for unauthenticated user", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

      const result = await getAuthenticatedSession();

      expect(result).toBeNull();
    });
  });

  describe("requireAuthentication", () => {
    it("should return authenticated result for valid session", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockSession.user);
      expect(result.session).toEqual(mockSession);
      expect(result.response).toBeUndefined();
    });

    it("should return unauthenticated result for null session", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return unauthenticated result for session without user id", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce({
        user: { id: "", email: "test@example.com", name: "Test", roles: [] },
        expires: "2025-12-31"
      });

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });

  describe("createAuthGuard", () => {
    it("should create guard that allows authenticated user without role requirements", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

      const guard = createAuthGuard();
      const result = await guard();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockSession.user);
    });

    it("should create guard that checks specific roles", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockAdminSession);

      const guard = createAuthGuard(["admin"]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockAdminSession.user);
    });

    it("should reject user without required role", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

      const guard = createAuthGuard(["admin"]);
      const result = await guard();

      expect(result.authenticated).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient permissions",
          required: ["admin"],
          userRoles: ["guest"]
        },
        { status: 403 }
      );
    });

    it("should allow user with one of multiple required roles", async () => {
      const userWithMultipleRoles: AppSession = {
        ...mockSession,
        user: { ...mockSession.user, roles: ["guest", "intake_clerk"] }
      };
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(userWithMultipleRoles);

      const guard = createAuthGuard(["admin", "intake_clerk"]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
    });

    it("should handle user with no roles (defaults to guest)", async () => {
      const userWithoutRoles: AppSession = {
        ...mockSession,
        user: { ...mockSession.user, roles: [] }
      };
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(userWithoutRoles);

      const guard = createAuthGuard(["admin"]);
      const result = await guard();

      expect(result.authenticated).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: "Insufficient permissions",
          required: ["admin"],
          userRoles: ["guest"] // Default role is applied
        },
        { status: 403 }
      );
    });

    it("should pass through authentication failures", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

      const guard = createAuthGuard(["admin"]);
      const result = await guard();

      expect(result.authenticated).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });

  describe("Additional server-side utilities", () => {
    describe("hasValidSession", () => {
      it("should be a function", () => {
        expect(typeof hasValidSession).toBe("function");
      });

      it("should return true for valid session", async () => {
        mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

        const result = await hasValidSession();

        expect(result).toBe(true);
      });

      it("should return false for invalid session", async () => {
        mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

        const result = await hasValidSession();

        expect(result).toBe(false);
      });
    });

    describe("getAuthenticatedUser", () => {
      it("should be a function", () => {
        expect(typeof getAuthenticatedUser).toBe("function");
      });

      it("should return user for authenticated session", async () => {
        mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

        const result = await getAuthenticatedUser();

        expect(result).toEqual(mockSession.user);
      });

      it("should return null for unauthenticated session", async () => {
        mockGetCurrentUserWithRoles.mockResolvedValueOnce(null);

        const result = await getAuthenticatedUser();

        expect(result).toBeNull();
      });
    });
  });

  describe("Authentication edge cases", () => {
    it("should handle empty role array in createAuthGuard", async () => {
      mockGetCurrentUserWithRoles.mockResolvedValueOnce(mockSession);

      const guard = createAuthGuard([]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
    });
  });
});
