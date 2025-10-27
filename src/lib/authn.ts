/**
 * Authentication Module - Consolidated NextAuth and Session Management
 * 
 * This module provides a unified interface for all authentication-related functionality
 * including NextAuth configuration, session management, user authentication, and 
 * client-side authentication utilities.
 */

import type { NextAuthOptions, Session, User as NextAuthUser, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";
import { signOut } from 'next-auth/react';
import SlackProvider from "next-auth/providers/slack";
import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/database";
import { UserRole } from "@/lib/types";
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
  session?: Session;
  user?: AuthenticatedUser;
  response?: NextResponse;
}

export interface AuthErrorContext {
  error: unknown;
  router?: { replace: (path: string) => void };
}

// =============================================================================
// NextAuth Configuration
// =============================================================================

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      authorization: {
        url: "https://slack.com/openid/connect/authorize",
        params: {
          scope: "openid profile email",
          team: process.env.SLACK_TEAM_ID || ''
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: NextAuthUser; account: Account | null }) {
      try {
        await connectToDatabase();
        
        if (account?.provider === 'slack') {
          const existingUser = await User.findByEmail(user.email!);
          
          if (!existingUser) {
            // Create new user with default guest role
            const newUser = await User.create({
              name: user.name!,
              email: user.email!,
              password: '', // OAuth users don't need passwords
              roles: ['guest'] // Start with guest role, can be promoted later
            });
            user.id = newUser.id;
          } else {
            user.id = existingUser.id;
          }
        }
        
        return true;
      } catch (error) {
        console.error('Authentication sign-in error:', error);
        return false;
      }
    },
    
    async jwt({ token, user, account }: { token: JWT; user?: NextAuthUser; account?: Account | null }) {
      // On initial sign in, add user info to token
      if (user && account) {
        try {
          await connectToDatabase();
          const dbUser = await User.findByEmail(user.email!);
          if (dbUser) {
            token.id = dbUser.id;
            token.roles = dbUser.roles || ['guest'];
          }
        } catch (error) {
          console.error('JWT callback error:', error);
          // Fallback to basic user info
          token.id = user.id;
          token.roles = ['guest'];
        }
      }
      
      // Refresh user data on token refresh (every 2 hours)
      if (token.id && !user) {
        try {
          await connectToDatabase();
          const dbUser = await User.findById(token.id as string);
          if (dbUser) {
            token.roles = dbUser.roles || ['guest'];
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          // Keep existing token data
        }
      }
      
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 2 * 60 * 60, // Update session every 2 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

// =============================================================================
// Server-Side Authentication
// =============================================================================

/**
 * Get the current authenticated session (server-side)
 */
export async function getAuthenticatedSession(): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('Error getting authenticated session:', error);
    return null;
  }
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
export async function refreshUserSession(userId: string): Promise<Session | null> {
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

// =============================================================================
// Client-Side Authentication Utilities
// =============================================================================

/**
 * Session refresh helper for client-side
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      throw new Error('Session refresh failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return null;
  }
}

/**
 * Sign out user with proper cleanup
 */
export async function signOutUser(callbackUrl: string = '/auth/signin'): Promise<void> {
  try {
    await signOut({ 
      callbackUrl, 
      redirect: true 
    });
  } catch (error) {
    console.error('Error during sign out:', error);
    // Force redirect on error
    window.location.href = callbackUrl;
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
// User Management Integration
// =============================================================================

/**
 * Create a new user account
 */
export async function createUserAccount(userData: {
  name: string;
  email: string;
  password?: string;
  roles?: string[];
}): Promise<AuthenticatedUser | null> {
  try {
    await connectToDatabase();
    
    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password || '',
      roles: userData.roles || ['guest']
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roles: newUser.roles || ['guest']
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    return null;
  }
}

/**
 * Update user roles
 */
export async function updateUserRoles(userId: string, roles: string[]): Promise<boolean> {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    await User.update(userId, { roles: roles as UserRole[] });
    return true;
  } catch (error) {
    console.error('Error updating user roles:', error);
    return false;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<AuthenticatedUser | null> {
  try {
    await connectToDatabase();
    
    const user = await User.findByEmail(email);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles || ['guest']
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
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
 * Validate session integrity
 */
export async function validateSession(session: Session): Promise<boolean> {
  try {
    if (!session?.user?.id) {
      return false;
    }

    // Check if user still exists in database
    await connectToDatabase();
    const user = await User.findById(session.user.id);
    
    return !!user;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: Session): boolean {
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
export function createMockSession(userData: Partial<AuthenticatedUser>): Session {
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

/**
 * Debug authentication state (development only)
 */
export async function debugAuthState(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const session = await getAuthenticatedSession();
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Authentication Debug ===');
    console.log('Session:', session);
    console.log('User ID:', session?.user?.id);
    console.log('User Roles:', session?.user?.roles);
    console.log('Session Expires:', session?.expires);
    console.log('=== End Debug ===');
  }
}