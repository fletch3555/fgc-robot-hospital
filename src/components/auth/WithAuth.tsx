'use client';

import { useSession } from '@/contexts/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface WithAuthProps {
  children: ReactNode;
  fallbackUrl?: string;
}

/**
 * Higher-order component that protects pages requiring authentication
 * Only handles authentication - use WithPermissions for authorization
 */
export function WithAuth({
  children,
  fallbackUrl = '/auth/signin'
}: WithAuthProps) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      if (process.env.NODE_ENV === 'development') {
        console.log('User not authenticated, redirecting to sign in');
      }
      router.replace(fallbackUrl);
      return;
    }
  }, [status, router, fallbackUrl]);

  // Show loading state
  if (status === 'loading') {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}