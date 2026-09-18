'use client';

import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { createClient } from "@/lib/supabase/client";
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
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import Image from "next/image";

export default function SignIn() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Use useEffect for client-side redirection
  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError('Invalid email or password');
        setSubmitting(false);
        return;
      }

      router.replace('/');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
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

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2} sx={{ mb: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                  autoFocus
                />

                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                  Sign In
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
