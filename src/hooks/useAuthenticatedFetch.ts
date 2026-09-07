'use client';

import { useSession } from '@/contexts/SessionContext';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { authenticatedFetch, handleAuthError } from '@/lib/auth-client';

/**
 * Custom hook for making authenticated API calls with proper error handling
 */
export function useAuthenticatedFetch() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    // Check if session is available
    if (status === 'loading') {
      throw new Error('Session is still loading');
    }

    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      throw new Error('Not authenticated');
    }

    try {
      const response = await authenticatedFetch(url, options);
      
      // Additional check for 401 responses
      if (response.status === 401) {
        handleAuthError({ status: 401 }, router);
        throw new Error('Authentication expired');
      }

      return response;
    } catch (error) {
      // Handle authentication errors
      if (handleAuthError(error, router)) {
        throw new Error('Authentication expired');
      }
      throw error;
    }
  }, [status, router]);

  return {
    fetchWithAuth,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    session,
  };
}