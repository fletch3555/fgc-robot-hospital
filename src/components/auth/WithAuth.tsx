'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface WithAuthProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'volunteer';
  fallbackUrl?: string;
}

/**
 * Higher-order component that protects pages requiring authentication
 */
export function WithAuth({ children, requiredRole, fallbackUrl = '/auth/signin' }: WithAuthProps) {
  const { data: session, status } = useSession();
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

    if (requiredRole && !session?.user?.roles?.includes(requiredRole)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`User roles ${session?.user?.roles} insufficient for required role ${requiredRole}`);
      }
      router.replace('/'); // Redirect to home if insufficient permissions
      return;
    }
  }, [status, session, router, requiredRole, fallbackUrl]);

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

  // Don't render if insufficient permissions
  if (requiredRole && !session?.user?.roles?.includes(requiredRole)) {
    return null;
  }

  return <>{children}</>;
}