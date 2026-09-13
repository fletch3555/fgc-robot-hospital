'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { countries } from '@/data/countries';
import {
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CardContent,
  Grid,
  Paper,
  Divider,
  Autocomplete,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon, SettingsRemote as SettingsRemoteIcon, SportsEsports as SportsEsportsIcon } from '@mui/icons-material';
import Link from 'next/link';
import { IBatterySwap, BatteryDeviceType } from '@/lib/types';

function EditBatterySwapPage({ params }: { params: Promise<{ id: string }> }) {
  const { fetchWithAuth, session, isAuthenticated, isLoading: authLoading } = useAuthenticatedFetch();
  const router = useRouter();

  const { id } = React.use(params);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [deviceType, setDeviceType] = useState<BatteryDeviceType | ''>('');
  const [notes, setNotes] = useState('');

  const fetchSwap = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/battery-swaps/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch battery swap');
      }
      const data: IBatterySwap = await response.json();
      setSwapStatus(data.status);
      setCountryCode(data.country_code);
      setDeviceType(data.device_type);
      setNotes(data.notes || '');
    } catch (err) {
      console.error('Error fetching battery swap:', err);
      setError('Failed to load battery swap');
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSwap();
    }
  }, [isAuthenticated, fetchSwap]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!countryCode) {
      setError('Please select a team');
      setIsSubmitting(false);
      return;
    }
    if (!deviceType) {
      setError('Please select a device type');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/battery-swaps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, deviceType, notes: notes || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update battery swap');
      }

      router.push('/battery-swaps');
      router.refresh();
    } catch (err) {
      console.error('Error updating battery swap:', err);
      setError(err instanceof Error ? err.message : 'Failed to update battery swap');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  if (error && !swapStatus) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button component={Link} href="/battery-swaps" startIcon={<ArrowBackIcon />} variant="outlined">
          Back to Battery Swaps
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button component={Link} href="/battery-swaps" startIcon={<ArrowBackIcon />} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Edit Battery Swap
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2}>
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Current Status:</strong> {swapStatus ? swapStatus.toUpperCase() : ''}
              <br />
              Correct the team or device type if it was recorded incorrectly. To reverse the
              swap, use &quot;Mark Returned&quot; on the Battery Swaps list instead.
            </Typography>
          </Alert>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  value={countries.find((country) => country.code === countryCode) || null}
                  onChange={(_, newValue) => setCountryCode(newValue?.code || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Country/Team" required fullWidth />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Device Type
                </Typography>
                <ToggleButtonGroup
                  value={deviceType}
                  exclusive
                  onChange={(_, newValue) => newValue && setDeviceType(newValue)}
                  aria-label="device type"
                  fullWidth
                >
                  <ToggleButton value="robot_controller" aria-label="robot controller">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <SettingsRemoteIcon />
                      <Typography variant="body2">Robot Controller</Typography>
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="driver_hub" aria-label="driver hub">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <SportsEsportsIcon />
                      <Typography variant="body2">Driver Hub</Typography>
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                />
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button component={Link} href="/battery-swaps" variant="outlined" disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Paper>
    </Box>
  );
}

export default function ProtectedEditBatterySwapPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['battery_swaps.edit']}>
        <EditBatterySwapPage params={params} />
      </WithPermissions>
    </WithAuth>
  );
}
