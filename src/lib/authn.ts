/**
 * Authentication Module - Session Management
 *
 * Unified interface for session/authentication helpers. Identity comes from
 * Supabase Auth (see src/lib/supabase/session.ts); this module wraps that in
 * the app's existing AuthenticationResult/AuthenticatedUser shapes so
 * callers didn't need to change when NextAuth was replaced.
 */

import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/database";
import type { AppSession } from "@/lib/auth-types";
import { getCurrentUserWithRoles } from "@/lib/supabase/session";
// Import client-side authentication utilities
import { authenticatedFetch, handleAuthError } from "./auth-client";

// Re-export client-side utilities for convenience
export { authenticatedFetch, handleAuthError };

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthenticationResult {
  authenticated: boolean;
  session?: AppSession;
  user?: AuthenticatedUser;
  response?: NextResponse;
}

export interface AuthErrorContext {
  error: unknown;
  router?: { replace: (path: string) => void };
}

// =============================================================================
// Server-Side Authentication
// =============================================================================

/**
 * Get the current authenticated session (server-side)
 */
export async function getAuthenticatedSession(): Promise<AppSession | null> {
  return getCurrentUserWithRoles();
}

/**
 * Require authentication for server-side operations
 * Returns session if authenticated, or appropriate error response
 */
export async function requireAuthentication(): Promise<AuthenticationResult> {
  const session = await getAuthenticatedSession();

  if (!session || !session.user?.id) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  return {
    authenticated: true,
    session,
    user: {
      id: session.user.id,
      name: session.user.name || '',
      email: session.user.email || '',
      roles: (session.user.roles && session.user.roles.length > 0) ? session.user.roles : ['guest']
    }
  };
}

/**
 * Check if a session exists (lighter check than requireAuthentication)
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await getAuthenticatedSession();
  return !!(session?.user?.id);
}

/**
 * Get authenticated user information
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getAuthenticatedSession();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    roles: (session.user.roles && session.user.roles.length > 0) ? session.user.roles : ['guest']
  };
}

/**
 * Refresh user data in the current session
 */
export async function refreshUserSession(userId: string): Promise<AppSession | null> {
  try {
    await connectToDatabase();
    const dbUser = await User.findById(userId);

    if (!dbUser) {
      return null;
    }

    const session = await getAuthenticatedSession();
    if (session && session.user.id === userId) {
      // Update session with fresh user data
      session.user.roles = dbUser.roles || ['guest'];
      return session;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing user session:', error);
    return null;
  }
}

/**
 * Check if error is authentication-related
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorObj = error as Record<string, unknown>;

  return (
    errorObj.status === 401 ||
    errorObj.statusCode === 401 ||
    (typeof errorObj.message === 'string' && (
      errorObj.message.includes('Unauthorized') ||
      errorObj.message.includes('Authentication') ||
      errorObj.message.includes('Token expired')
    ))
  );
}

// =============================================================================
// Authentication Guards and Middleware Helpers
// =============================================================================

/**
 * Create an authentication guard for API routes
 */
export function createAuthGuard(requiredRoles?: string[]) {
  return async (): Promise<AuthenticationResult> => {
    const authResult = await requireAuthentication();

    if (!authResult.authenticated) {
      return authResult;
    }

    // Check roles if specified
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = (authResult.user?.roles && authResult.user.roles.length > 0) ? authResult.user.roles : ['guest'];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return {
          authenticated: false,
          response: NextResponse.json({
            error: 'Insufficient permissions',
            required: requiredRoles,
            userRoles
          }, { status: 403 })
        };
      }
    }

    return authResult;
  };
}

// =============================================================================
// Session Validation and Security
// =============================================================================

/**
 * Check if session is expired
 */
export function isSessionExpired(session: AppSession): boolean {
  if (!session?.expires) {
    return true;
  }

  const now = new Date();
  const expires = new Date(session.expires);

  return now >= expires;
}

/**
 * Security headers for authenticated routes
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, max-age=0'
  };
}

// =============================================================================
// Development and Testing Utilities
// =============================================================================

/**
 * Create a mock session for testing (development only)
 */
export function createMockSession(userData: Partial<AuthenticatedUser>): AppSession {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock sessions are not allowed in production');
  }

  return {
    user: {
      id: userData.id || 'mock-user-id',
      name: userData.name || 'Mock User',
      email: userData.email || 'mock@example.com',
      roles: userData.roles || ['guest']
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours from now
  };
}
