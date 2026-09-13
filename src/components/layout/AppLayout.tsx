'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { Box, Toolbar, Container } from '@mui/material';
import Sidebar from './Sidebar';
import TopAppBar from './AppBar';
import { drawerWidth } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Routes that render full-screen, without the sidebar/app chrome, regardless
// of auth status — e.g. a shared kiosk display (see middleware.ts, which
// also allows this path without authentication).
const CHROME_FREE_PATHS = ['/monitor'];

export default function AppLayout({ children }: AppLayoutProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (CHROME_FREE_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </Box>
    );
  }

  // If user is not authenticated, render children directly (for auth pages)
  if (status === 'unauthenticated') {
    return <>{children}</>;
  }

  // Authenticated layout with sidebar
  return (
    <Box sx={{ display: 'flex' }}>
      <TopAppBar onMobileMenuToggle={handleMobileToggle} />
      
      <Sidebar 
        mobileOpen={mobileOpen} 
        onMobileToggle={handleMobileToggle} 
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        
        <Container 
          maxWidth="xl" 
          sx={{ 
            py: 3,
            px: { xs: 2, sm: 3 }
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}