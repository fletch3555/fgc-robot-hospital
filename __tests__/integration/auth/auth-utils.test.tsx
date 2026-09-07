/**
 * Authentication Utilities Tests
 *
 * Tests for auth utilities, hooks, and HOCs
 */

import { renderHook } from '@testing-library/react';
import { useSession } from '@/contexts/SessionContext';
import { createClient } from '@/lib/supabase/client';
import { AppSession } from '@/lib/auth-types';
import { useRouter } from 'next/navigation';
import { useAuthenticatedFetch } from '../../../src/hooks/useAuthenticatedFetch';
import { authenticatedFetch, handleAuthError } from '../../../src/lib/authn';
import { IUserSummary } from '@/lib/types';

// Mock dependencies
jest.mock('@/contexts/SessionContext');
jest.mock('@/lib/supabase/client');
jest.mock('next/navigation');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockSignOut = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  bfcacheId: 'test-bfcache-id',
};

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Authentication Utilities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockSignOut.mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue({
      auth: { signOut: mockSignOut },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticatedFetch utility', () => {
    test('should make successful API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const response = await authenticatedFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(response.ok).toBe(true);
    });

    test('should handle 401 responses by signing out', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(authenticatedFetch('/api/test')).rejects.toThrow('Authentication expired');

      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should pass through non-401 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server Error' }),
      });

      const response = await authenticatedFetch('/api/test');
      expect(response.status).toBe(500);
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    test('should preserve custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await authenticatedFetch('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token',
        },
      });
    });
  });

  describe('handleAuthError utility', () => {
    test('should redirect on 401 error with router', () => {
      const error = { status: 401 };
      const result = handleAuthError(error, mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin');
    });

    test('should sign out on 401 error without router', () => {
      const error = { status: 401 };
      const result = handleAuthError(error);

      expect(result).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should handle Unauthorized message', () => {
      const error = { message: 'Unauthorized access' };
      const result = handleAuthError(error, mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin');
    });

    test('should not handle non-auth errors', () => {
      const error = { status: 500, message: 'Server error' };
      const result = handleAuthError(error, mockRouter);

      expect(result).toBe(false);
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('useAuthenticatedFetch hook', () => {
    test('should provide authenticated fetch function for authenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'user@example.com', name: 'Test User', roles: ['volunteer'] },
          expires: '2025-12-31',
        },
        status: 'authenticated',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toBeDefined();

      // Test fetchWithAuth
      const response = await result.current.fetchWithAuth('/api/test');
      expect(response.ok).toBe(true);
    });

    test('should redirect unauthenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);

      // Test fetchWithAuth redirects
      await expect(result.current.fetchWithAuth('/api/test')).rejects.toThrow('Not authenticated');
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin');
    });

    test('should handle loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);

      // Should throw error during loading
      expect(() => result.current.fetchWithAuth('/api/test')).rejects.toThrow('Session is still loading');
    });

    test('should handle 401 responses in fetchWithAuth', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'user@example.com', name: 'Test User', roles: ['volunteer'] },
          expires: '2025-12-31',
        },
        status: 'authenticated',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      await expect(result.current.fetchWithAuth('/api/test')).rejects.toThrow('Authentication expired');

      // The 401 response triggers signOut rather than router.replace
      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should preserve fetch options', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'user@example.com', name: 'Test User', roles: ['volunteer'] },
          expires: '2025-12-31',
        },
        status: 'authenticated',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      await result.current.fetchWithAuth('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    test('should handle network errors gracefully', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'user@example.com', name: 'Test User', roles: ['volunteer'] },
          expires: '2025-12-31',
        },
        status: 'authenticated',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthenticatedFetch());

      await expect(result.current.fetchWithAuth('/api/test')).rejects.toThrow('Network error');
    });

    test('should handle malformed session data', () => {
      mockUseSession.mockReturnValue({
        data: { user: null, expires: new Date().toISOString() } as unknown as AppSession, // Malformed session
        status: 'authenticated',
      });

      const { result } = renderHook(() => useAuthenticatedFetch());

      // Should still be considered authenticated based on status
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Session State Changes', () => {
    test('should update authentication state when session changes', async () => {
      // Start unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { result, rerender } = renderHook(() => useAuthenticatedFetch());

      expect(result.current.isAuthenticated).toBe(false);

      // Change to authenticated
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'user@example.com', name: 'Test User', roles: ['volunteer'] },
          expires: '2025-12-31',
        },
        status: 'authenticated',
      });

      rerender();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).toBeDefined();
    });
  });

  describe('Role-Based Functionality', () => {
    test('should provide correct user role information', () => {
      const testCases = [
        { role: 'admin', expected: 'admin' },
        { role: 'volunteer', expected: 'volunteer' },
        { role: 'lead_robot_inspector', expected: 'lead_robot_inspector' },
      ];

      testCases.forEach(({ role, expected }) => {
        mockUseSession.mockReturnValue({
          data: {
            user: { id: '1', email: 'user@example.com', name: 'Test User', roles: [role] },
            expires: '2025-12-31',
          },
          status: 'authenticated',
        });

        const { result } = renderHook(() => useAuthenticatedFetch());

        expect((result.current.session?.user as IUserSummary)?.roles).toContain(expected);
      });
    });
  });
});
