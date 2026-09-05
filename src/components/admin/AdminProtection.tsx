'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AdminProtectionProps {
  children: React.ReactNode;
}

export default function AdminProtection({ children }: AdminProtectionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!session?.user?.roles?.includes('admin')) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="error">
          Access Denied
        </Typography>
        <Typography>
          You need admin privileges to access this page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}