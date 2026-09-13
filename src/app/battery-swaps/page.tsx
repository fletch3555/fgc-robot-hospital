'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { usePermissions } from '@/contexts/PermissionsContext';
import { IBatterySwap, BatterySwapStatus } from '@/lib/types';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const DEVICE_LABELS: Record<string, string> = {
  robot_controller: 'Robot Controller',
  driver_hub: 'Driver Hub',
};

type StatusFilter = BatterySwapStatus | 'all';

function BatterySwapsPage() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const { hasPermission } = usePermissions();
  const [swaps, setSwaps] = useState<IBatterySwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('swapped');
  const [returningId, setReturningId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchSwaps();
    }
  }, [isAuthenticated, fetchSwaps]);

  const handleMarkReturned = async (id: string) => {
    setReturningId(id);
    try {
      const response = await fetchWithAuth(`/api/battery-swaps/${id}`, { method: 'PATCH' });
      if (!response.ok) {
        throw new Error('Failed to mark swap as returned');
      }
      fetchSwaps();
    } catch (err) {
      console.error(err);
      setError('Failed to mark swap as returned');
    } finally {
      setReturningId(null);
    }
  };

  const formatDate = (dateString: string) => {
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

        {swaps.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No battery swaps found
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Swapped Out</TableCell>
                  <TableCell>Returned</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {swaps.map((swap) => (
                  <TableRow key={swap.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{swap.country_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {swap.country_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{DEVICE_LABELS[swap.device_type] || swap.device_type}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={swap.status === 'swapped' ? 'warning.main' : 'success.main'}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {swap.status.toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{formatDate(swap.created_at as unknown as string)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {swap.submitted_by_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {swap.status === 'returned' && swap.updated_at ? (
                        <Box>
                          <Typography variant="body2">{formatDate(swap.updated_at as unknown as string)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {swap.handled_by_name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {swap.notes || ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            component={Link}
                            href={`/battery-swaps/edit/${swap.id}`}
                          >
                            Edit
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
