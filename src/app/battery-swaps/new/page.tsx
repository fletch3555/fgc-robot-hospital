'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  SettingsRemote as SettingsRemoteIcon,
  SportsEsports as SportsEsportsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { IBatterySwap, BatteryDeviceType } from '@/lib/types';

const DEVICE_LABELS: Record<BatteryDeviceType, string> = {
  robot_controller: 'Robot Controller',
  driver_hub: 'Driver Hub',
};

function NewBatterySwap() {
  const router = useRouter();
  const { fetchWithAuth } = useAuthenticatedFetch();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [deviceType, setDeviceType] = useState<BatteryDeviceType | ''>('');
  const [notes, setNotes] = useState('');
  const [outstandingSwaps, setOutstandingSwaps] = useState<IBatterySwap[]>([]);

  // Soft-warning check: does this team+device already have an outstanding swap?
  useEffect(() => {
    if (!countryCode || !deviceType) {
      setOutstandingSwaps([]);
      return;
    }

    let cancelled = false;
    const checkOutstanding = async () => {
      try {
        const response = await fetchWithAuth(
          `/api/battery-swaps?countryCode=${countryCode}&deviceType=${deviceType}&status=swapped`
        );
        if (response.ok && !cancelled) {
          setOutstandingSwaps(await response.json());
        }
      } catch (err) {
        console.error('Error checking for outstanding swaps:', err);
      }
    };

    checkOutstanding();
    return () => {
      cancelled = true;
    };
  }, [countryCode, deviceType, fetchWithAuth]);

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
      const response = await fetchWithAuth('/api/battery-swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, deviceType, notes: notes || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record battery swap');
      }

      router.push('/battery-swaps');
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button component={Link} href="/battery-swaps" startIcon={<ArrowBackIcon />} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Battery Swap Intake
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
              <strong>How it works:</strong> Record swapping a team&apos;s low battery for a
              charged hospital spare so they can keep competing. Mark it returned once the
              team&apos;s original battery is charged and swapped back.
            </Typography>
          </Alert>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  Swap Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

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
                  onChange={(_, newValue) => setDeviceType(newValue || '')}
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

              {outstandingSwaps.length > 0 && (
                <Grid size={12}>
                  <Alert severity="warning">
                    {countries.find((c) => c.code === countryCode)?.name || countryCode} already
                    has an outstanding {deviceType && DEVICE_LABELS[deviceType]} swap — consider
                    processing that return first.
                  </Alert>
                </Grid>
              )}

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
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Recording Swap...' : 'Record Swap'}
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

export default function ProtectedNewBatterySwap() {
  return (
    <WithAuth>
      <NewBatterySwap />
    </WithAuth>
  );
}
