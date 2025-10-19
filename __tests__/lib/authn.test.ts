/**
 * Authentication Module Tests - lib/authn.ts
 * 
 * Tests for the unified authentication module covering
 * session management, authentication guards, and utilities.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import {
  getAuthenticatedSession,
  requireAuthentication,
  createAuthGuard,
  hasValidSession,
  getAuthenticatedUser,
} from "@/lib/authn";
import { authOptions } from "@/lib/authn";
import type { Session } from "next-auth";

// Type definitions for testing
type MockResponse = {
  json: () => Promise<unknown>;
  status: number;
};
type MockNextResponseStatic = {
  json: jest.MockedFunction<(data: unknown, init?: { status?: number }) => MockResponse>;
};

// Mock dependencies
jest.mock("next-auth/next");
jest.mock("next/server");

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockNextResponse = NextResponse as unknown as MockNextResponseStatic;

describe("Authentication Module - lib/authn.ts", () => {
  // Mock data
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      roles: ["guest"]
    },
    expires: "2025-12-31"
  };

  const mockAdminSession = {
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
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const result = await getAuthenticatedSession();

      expect(result).toEqual(mockSession);
      expect(mockGetServerSession).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.any(Array),
          callbacks: expect.objectContaining({
            jwt: expect.any(Function),
            session: expect.any(Function),
            signIn: expect.any(Function)
          }),
          pages: expect.objectContaining({
            signIn: "/auth/signin",
            error: "/auth/error"
          })
        })
      );
    });

    it("should return null for unauthenticated user", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await getAuthenticatedSession();

      expect(result).toBeNull();
    });

    it("should return session even without user (for consistency)", async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: null, expires: "2025-12-31" } as unknown as Session);

      const result = await getAuthenticatedSession();

      expect(result).toEqual({ user: null, expires: "2025-12-31" });
    });

    it("should return session even without user ID (for consistency)", async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: "test@example.com", name: "Test" },
        expires: "2025-12-31"
      } as unknown as Session);

      const result = await getAuthenticatedSession();

      expect(result).toEqual({
        user: { email: "test@example.com", name: "Test" },
        expires: "2025-12-31"
      });
    });
  });

  describe("requireAuthentication", () => {
    it("should return authenticated result for valid session", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockSession.user);
      expect(result.session).toEqual(mockSession);
      expect(result.response).toBeUndefined();
    });

    it("should return unauthenticated result for null session", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return unauthenticated result for session without user", async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: null, expires: "2025-12-31" } as unknown as Session);

      const result = await requireAuthentication();

      expect(result.authenticated).toBe(false);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return unauthenticated result for session without user ID", async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: "test@example.com", name: "Test" },
        expires: "2025-12-31"
      } as Session);

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
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const guard = createAuthGuard();
      const result = await guard();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockSession.user);
    });

    it("should create guard that checks specific roles", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession as Session);

      const guard = createAuthGuard(["admin"]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockAdminSession.user);
    });

    it("should reject user without required role", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

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
      const userWithMultipleRoles = {
        ...mockSession,
        user: { ...mockSession.user, roles: ["guest", "intake_clerk"] }
      };
      mockGetServerSession.mockResolvedValueOnce(userWithMultipleRoles as Session);

      const guard = createAuthGuard(["admin", "intake_clerk"]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
    });

    it("should handle user with no roles (defaults to guest)", async () => {
      const userWithoutRoles = {
        ...mockSession,
        user: { ...mockSession.user, roles: [] }
      };
      mockGetServerSession.mockResolvedValueOnce(userWithoutRoles as Session);

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
      mockGetServerSession.mockResolvedValueOnce(null);

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
        mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

        const result = await hasValidSession();

        expect(result).toBe(true);
      });

      it("should return false for invalid session", async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        const result = await hasValidSession();

        expect(result).toBe(false);
      });
    });

    describe("getAuthenticatedUser", () => {
      it("should be a function", () => {
        expect(typeof getAuthenticatedUser).toBe("function");
      });

      it("should return user for authenticated session", async () => {
        mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

        const result = await getAuthenticatedUser();

        expect(result).toEqual(mockSession.user);
      });

      it("should return null for unauthenticated session", async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        const result = await getAuthenticatedUser();

        expect(result).toBeNull();
      });
    });
  });

  describe("authOptions", () => {
    it("should be defined", () => {
      expect(authOptions).toBeDefined();
    });

    it("should have required NextAuth configuration", () => {
      expect(authOptions.pages).toBeDefined();
      expect(authOptions.session).toBeDefined();
      expect(authOptions.callbacks).toBeDefined();
    });

    it("should have signin and error pages configured", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/signin");
      expect(authOptions.pages?.error).toBe("/auth/error");
    });

    it("should use jwt strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have session and jwt callbacks", () => {
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(authOptions.callbacks?.jwt).toBeDefined();
    });
  });

  describe("Authentication edge cases", () => {
    it("should handle getServerSession throwing an error", async () => {
      mockGetServerSession.mockRejectedValueOnce(new Error("Session error"));

      const result = await getAuthenticatedSession();

      expect(result).toBeNull();
    });

    it("should handle empty role array in createAuthGuard", async () => {
      mockGetServerSession.mockResolvedValueOnce(mockSession as Session);

      const guard = createAuthGuard([]);
      const result = await guard();

      expect(result.authenticated).toBe(true);
    });

    it("should handle malformed session object", async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: {
          id: "user-123",
          email: "test@example.com"
          // Missing name
        },
        expires: "2025-12-31"
      } as Session);

      const result = await getAuthenticatedSession();

      expect(result).toEqual({
        user: {
          id: "user-123",
          email: "test@example.com"
        },
        expires: "2025-12-31"
      });
    });
  });
});