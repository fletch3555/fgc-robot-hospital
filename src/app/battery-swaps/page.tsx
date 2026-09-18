'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { usePermissions } from '@/contexts/PermissionsContext';
import { IBatterySwap, IBatterySwapPoolStatus, BatterySwapStatus, BatteryDeviceType } from '@/lib/types';
import {
  Container,
  Typography,
  Box,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const DEVICE_LABELS: Record<string, string> = {
  robot_controller: 'Robot Controller',
  driver_hub: 'Driver Hub',
};

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

type StatusFilter = BatterySwapStatus | 'all';

function formatDate(dateString: string) {
  try {
    let date = new Date(dateString);
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-')) {
      date = new Date(dateString + 'Z');
    }
    if (isNaN(date.getTime())) return 'Invalid Date';

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dayName} ${time}`;
  } catch {
    return 'Invalid Date';
  }
}

function BatterySwapsPage() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const { hasPermission } = usePermissions();
  const theme = useTheme();
  const isWideScreen = useMediaQuery(theme.breakpoints.up('md'));

  const [swaps, setSwaps] = useState<IBatterySwap[]>([]);
  const [pool, setPool] = useState<IBatterySwapPoolStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('swapped');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [editingPoolType, setEditingPoolType] = useState<BatteryDeviceType | null>(null);
  const [poolEditValue, setPoolEditValue] = useState('');

  const fetchSwaps = useCallback(() => {
    setLoading(true);
    const params = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    fetchWithAuth(`/api/battery-swaps${params}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch battery swaps');
        }
        return res.json();
      })
      .then((data) => setSwaps(data))
      .catch((err) => {
        console.error(err);
        setError('Failed to load battery swaps');
      })
      .finally(() => setLoading(false));
  }, [fetchWithAuth, statusFilter]);

  const fetchPool = useCallback(() => {
    fetchWithAuth('/api/battery-swaps/pool')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPool(data))
      .catch((err) => console.error('Failed to load loaner pool:', err));
  }, [fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSwaps();
      fetchPool();
    }
  }, [isAuthenticated, fetchSwaps, fetchPool]);

  const handleMarkReturned = async (id: string) => {
    setReturningId(id);
    try {
      const response = await fetchWithAuth(`/api/battery-swaps/${id}`, { method: 'PATCH' });
      if (!response.ok) {
        throw new Error('Failed to mark swap as returned');
      }
      fetchSwaps();
      fetchPool();
    } catch (err) {
      console.error(err);
      setError('Failed to mark swap as returned');
    } finally {
      setReturningId(null);
    }
  };

  const startEditPool = (poolStatus: IBatterySwapPoolStatus) => {
    setEditingPoolType(poolStatus.device_type);
    setPoolEditValue(String(poolStatus.total_count));
  };

  const cancelEditPool = () => {
    setEditingPoolType(null);
    setPoolEditValue('');
  };

  const saveEditPool = async () => {
    if (!editingPoolType) return;
    const totalCount = parseInt(poolEditValue, 10);
    if (isNaN(totalCount) || totalCount < 0) return;

    try {
      const response = await fetchWithAuth('/api/battery-swaps/pool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceType: editingPoolType, totalCount }),
      });
      if (!response.ok) {
        throw new Error('Failed to update loaner pool');
      }
      setPool(await response.json());
      cancelEditPool();
    } catch (err) {
      console.error(err);
      setError('Failed to update loaner pool');
    }
  };

  if (isLoading || loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  // Sorted oldest first by default, shared by both the side-by-side and
  // combined layouts.
  const sortedSwaps = [...swaps].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const renderSwapCard = (swap: IBatterySwap) => (
    <Paper key={swap.id} variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {swap.country_name} <Typography component="span" variant="caption" color="text.secondary">({swap.country_code})</Typography>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {DEVICE_LABELS[swap.device_type] || swap.device_type}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {!swap.loaner_provided && (
            <Chip label="NO LOANER" size="small" variant="outlined" />
          )}
          <Chip
            label={swap.status.toUpperCase()}
            size="small"
            color={swap.status === 'swapped' ? 'warning' : 'success'}
          />
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {swap.loaner_provided ? 'Swapped out' : 'Dropped off'} {formatDate(swap.created_at as unknown as string)} by {swap.submitted_by_name}
        </Typography>
        {swap.status === 'returned' && swap.updated_at && (
          <Typography variant="caption" color="text.secondary">
            Returned {formatDate(swap.updated_at as unknown as string)} by {swap.handled_by_name}
          </Typography>
        )}
      </Stack>

      {swap.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {swap.notes}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        {swap.status === 'swapped' && hasPermission('battery_swaps.return') && (
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={returningId === swap.id}
            onClick={() => handleMarkReturned(swap.id)}
          >
            Mark Returned
          </Button>
        )}
        {hasPermission('battery_swaps.edit') && (
          <Button size="small" variant="outlined" startIcon={<EditIcon />} component={Link} href={`/battery-swaps/edit/${swap.id}`}>
            Edit
          </Button>
        )}
      </Stack>
    </Paper>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Battery Swaps
          </Typography>
          {hasPermission('battery_swaps.create') && (
            <Button component={Link} href="/battery-swaps/new" variant="contained" startIcon={<AddIcon />}>
              New Swap
            </Button>
          )}
        </Box>

        {pool.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 'medium' }}>
                Loaner Pool
              </Typography>
              <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
                {pool.map((p) => (
                  <Box key={p.device_type}>
                    <Typography variant="caption" color="text.secondary">
                      {DEVICE_LABELS[p.device_type] || p.device_type}
                    </Typography>
                    {editingPoolType === p.device_type ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <TextField
                          size="small"
                          type="number"
                          value={poolEditValue}
                          onChange={(e) => setPoolEditValue(e.target.value)}
                          slotProps={{ htmlInput: { min: 0 } }}
                          sx={{ width: 80 }}
                          autoFocus
                        />
                        <IconButton size="small" color="primary" onClick={saveEditPool}>
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={cancelEditPool}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="h6" color={p.available_count > 0 ? 'text.primary' : 'error.main'}>
                          {p.available_count} / {p.total_count} available
                        </Typography>
                        {hasPermission('battery_swaps.configure') && (
                          <IconButton size="small" onClick={() => startEditPool(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {p.outstanding_count} currently out
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, newValue) => newValue && setStatusFilter(newValue)}
          size="small"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="swapped">Outstanding</ToggleButton>
          <ToggleButton value="returned">Returned</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>

        {sortedSwaps.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No battery swaps found
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : isWideScreen ? (
          <Grid container spacing={3}>
            {DEVICE_TYPES.map((deviceType) => {
              const deviceSwaps = sortedSwaps.filter((s) => s.device_type === deviceType);
              return (
                <Grid key={deviceType} size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {DEVICE_LABELS[deviceType]} ({deviceSwaps.length})
                  </Typography>
                  <Stack spacing={2}>
                    {deviceSwaps.length > 0 ? (
                      deviceSwaps.map(renderSwapCard)
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Stack spacing={2}>{sortedSwaps.map(renderSwapCard)}</Stack>
        )}
      </Box>
    </Container>
  );
}

export default function ProtectedBatterySwapsPage() {
  return (
    <WithAuth>
      <WithPermissions
        requiredAnyPermissions={['battery_swaps.view', 'battery_swaps.create', 'battery_swaps.edit', 'battery_swaps.return']}
      >
        <BatterySwapsPage />
      </WithPermissions>
    </WithAuth>
  );
}
