/**
 * Client-side Authentication Utilities
 * 
 * This module provides client-side authentication functions that can be safely
 * imported in React components without causing server-side dependency issues.
 * 
 * These are the canonical implementations - authn.ts re-exports these functions.
 */

'use client';

import { createClient } from './supabase/client';
import { AuthError } from './auth-types';

async function signOutAndRedirect(callbackUrl: string) {
  await createClient().auth.signOut();
  window.location.href = callbackUrl;
}

/**
 * Enhanced fetch wrapper that handles authentication errors
 * This is the canonical client-side implementation
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle authentication errors
  if (response.status === 401) {
    console.warn('Authentication token expired, redirecting to sign in');
    await signOutAndRedirect('/auth/signin');
    throw new Error('Authentication expired');
  }

  return response;
}

/**
 * Handle authentication errors in API responses
 * This is the canonical client-side implementation
 */
export function handleAuthError(error: unknown, router?: { replace: (path: string) => void }): boolean {
  const isAuthError = error &&
    typeof error === 'object' &&
    ('status' in error && error.status === 401 ||
     'message' in error && typeof error.message === 'string' && error.message.includes('Unauthorized'));

  if (isAuthError) {
    console.warn('Authentication error detected, redirecting to sign in');
    if (router) {
      router.replace('/auth/signin');
    } else {
      signOutAndRedirect('/auth/signin');
    }
    return true;
  }
  return false;
}

/**
 * Create a standardized auth error object
 */
export function createAuthError(message: string, code: string, status: number): AuthError {
  return {
    message,
    code,
    status
  };
}