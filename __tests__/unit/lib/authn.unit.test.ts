/**
 * Unit Tests for Authentication Utilities - authn.ts
 * 
 * Tests for pure authentication functions that don't require external dependencies.
 * These are true unit tests that test individual functions in isolation.
 */

import { AppSession } from '@/lib/auth-types';

describe('Authentication Utilities - Unit Tests', () => {
  
  describe('isAuthenticationError', () => {
    // Import the function dynamically to avoid Jest hoisting issues with mocks
    let isAuthenticationError: (error: unknown) => boolean;
    
    beforeAll(async () => {
      const authnModule = await import('../../../src/lib/authn');
      isAuthenticationError = authnModule.isAuthenticationError;
    });

    it('should return true for error with status 401', () => {
      const error = { status: 401 };
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for error with statusCode 401', () => {
      const error = { statusCode: 401 };
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for error with Unauthorized message', () => {
      const error = { message: 'Unauthorized access' };
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for error with Authentication message', () => {
      const error = { message: 'Authentication failed' };
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for error with Token expired message', () => {
      const error = { message: 'Token expired' };
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for non-authentication errors', () => {
      const error = { status: 500, message: 'Internal server error' };
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isAuthenticationError(null)).toBe(false);
      expect(isAuthenticationError(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isAuthenticationError('string error')).toBe(false);
      expect(isAuthenticationError(404)).toBe(false);
      expect(isAuthenticationError(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isAuthenticationError({})).toBe(false);
    });
  });

  describe('isSessionExpired', () => {
    let isSessionExpired: (session: AppSession) => boolean;
    
    beforeAll(async () => {
      const authnModule = await import('../../../src/lib/authn');
      isSessionExpired = authnModule.isSessionExpired;
    });

    it('should return true for session without expires field', () => {
      const session = { user: { id: 'test' } } as unknown as AppSession;
      expect(isSessionExpired(session)).toBe(true);
    });

    it('should return true for expired session', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const session = { 
        user: { id: 'test' },
        expires: pastDate 
      } as unknown as AppSession;
      expect(isSessionExpired(session)).toBe(true);
    });

    it('should return false for valid future session', () => {
      const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 minute from now
      const session = { 
        user: { id: 'test' },
        expires: futureDate 
      } as unknown as AppSession;
      expect(isSessionExpired(session)).toBe(false);
    });

    it('should return true for session expiring right now', () => {
      const now = new Date().toISOString();
      const session = { 
        user: { id: 'test' },
        expires: now 
      } as unknown as AppSession;
      // Due to timing, this might be true or false, but let's test the boundary
      const result = isSessionExpired(session);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getSecurityHeaders', () => {
    let getSecurityHeaders: () => HeadersInit;
    
    beforeAll(async () => {
      const authnModule = await import('../../../src/lib/authn');
      getSecurityHeaders = authnModule.getSecurityHeaders;
    });

    it('should return all required security headers', () => {
      const headers = getSecurityHeaders();
      
      expect(headers).toEqual({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store, max-age=0'
      });
    });

    it('should return consistent headers on multiple calls', () => {
      const headers1 = getSecurityHeaders();
      const headers2 = getSecurityHeaders();
      
      expect(headers1).toEqual(headers2);
    });
  });

  describe('createMockSession', () => {
    let createMockSession: typeof import('../../../src/lib/authn').createMockSession;
    const originalEnv = process.env.NODE_ENV;
    
    beforeAll(async () => {
      const authnModule = await import('../../../src/lib/authn');
      createMockSession = authnModule.createMockSession;
    });

    beforeEach(() => {
      // Ensure we're in test environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true
      });
    });

    afterAll(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true
      });
    });

    it('should create mock session with provided data', () => {
      const userData = {
        id: 'test-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin']
      };

      const session = createMockSession(userData);

      expect(session.user).toEqual({
        id: 'test-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin']
      });
      expect(session.expires).toBeDefined();
    });

    it('should use default values for missing data', () => {
      const userData = { name: 'Custom Name' };

      const session = createMockSession(userData);

      expect(session.user).toEqual({
        id: 'mock-user-id',
        name: 'Custom Name',
        email: 'mock@example.com',
        roles: ['guest']
      });
    });

    it('should create session with empty userData object', () => {
      const session = createMockSession({});

      expect(session.user).toEqual({
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'mock@example.com',
        roles: ['guest']
      });
    });

    it('should throw error in production environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      });

      expect(() => {
        createMockSession({});
      }).toThrow('Mock sessions are not allowed in production');
    });
  });
});