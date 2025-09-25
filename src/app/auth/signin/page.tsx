'use client';

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  Stack,
  Toolbar,
  AppBar,
} from '@mui/material';
import Image from "next/image";

export default function SignIn() {
  const { data: session } = useSession();
  const router = useRouter();

  // Use useEffect for client-side redirection
  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  const handleSlackSignIn = () => {
    signIn('slack', { callbackUrl: '/' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top App Bar - same as main app but without mobile menu */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {/* Centered content container */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 2
            }}
          >
            {/* App Title */}
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              (Unofficial)
            </Typography>
            {/* FIRST Global Logo */}
            <Image
              src="/images/logo.png"
              alt="FIRST Global"
              width={120}
              height={40}
              style={{ objectFit: 'contain' }}
            />
            
            {/* App Title */}
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              Robot Hospital Information System
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        
        <Container maxWidth="sm">
          <Paper sx={{ p: 4 }}>
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Sign In
            </Typography>

            {/* OAuth Providers */}
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSlackSignIn}
                startIcon={
                  <Image
                    src="/slack-icon.svg"
                    alt="Slack"
                    width={20}
                    height={20}
                    style={{ marginRight: 8 }}
                  />
                }
                sx={{
                  color: '#000',
                  borderColor: '#ddd',
                  '&:hover': {
                    borderColor: '#1DB954',
                    backgroundColor: 'rgba(29, 185, 84, 0.04)',
                  },
                }}
              >
                Continue with Slack
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}