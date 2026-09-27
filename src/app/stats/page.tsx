"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
  Assessment as StatsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PermissionName } from '@/lib/auth-types';
import { IRequest } from '@/lib/types';

interface AnalyticsSummary {
  requestsByType: Array<{ type: string; total: number; open: number; inProgress: number; completed: number; todayCount: number }>;
  openRequestsByType: Array<{ type: string; count: number; averageAgeHours: number }>;
  averageResolutionTime: Array<{ type: string; averageMinutes: number; completedCount: number }>;
  performanceMetrics: {
    totalCompleted: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    activeRequests: number;
    averageResolutionMinutes: number;
  };
  requestsByStatus: Array<{ status: string; total: number; today: number; thisWeek: number }>;
  completedByDay: Array<{ date: string; count: number }>;
}

const TYPE_LABELS: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  machine_shop: 'Machine Shop',
  battery_charging: 'Battery Charging',
};

const TYPE_ICONS: Record<string, React.ReactElement> = {
  hardware: <BuildRounded fontSize="small" />,
  software: <ComputerRounded fontSize="small" />,
  machine_shop: <PrecisionManufacturingRounded fontSize="small" />,
  battery_charging: <BatteryChargingFullRounded fontSize="small" />,
};

const REQUEST_TYPES: { key: IRequest['type']; permission: PermissionName }[] = [
  { key: 'hardware', permission: 'hardware.view' },
  { key: 'software', permission: 'software.view' },
  { key: 'machine_shop', permission: 'machine_shop.view' },
  { key: 'battery_charging', permission: 'battery_charging.view' },
];

function formatMinutes(minutes: number): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}

function formatHours(hours: number): string {
  if (!hours) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function StatsPage() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const { hasAnyPermission, hasPermission } = usePermissions();

  const canSeeRequests = hasAnyPermission(['requests.view', 'hardware.view', 'software.view', 'machine_shop.view']);

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/dashboard/analytics');
      if (!res.ok) throw new Error('Failed to load stats');
      setAnalytics(await res.json());
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated && canSeeRequests) {
      fetchAnalytics();
    } else if (isAuthenticated) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canSeeRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (isLoading || (isAuthenticated && loading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canSeeRequests) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="info">You don&apos;t have access to the intake queue stats.</Alert>
      </Box>
    );
  }

  if (error || !analytics) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Failed to load stats'}</Alert>
      </Box>
    );
  }

  const { performanceMetrics, requestsByStatus, requestsByType, openRequestsByType, averageResolutionTime, completedByDay } = analytics;
  const openCount = requestsByStatus.find((s) => s.status === 'open')?.total || 0;

  const byType = <T extends { type: string }>(list: T[], type: string) => list.find((row) => row.type === type);

  const visibleTypes = REQUEST_TYPES.filter((t) => hasPermission(t.permission));

  return (
    <Box sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StatsIcon />
          Stats
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Updated {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <IconButton onClick={handleRefresh} disabled={refreshing} aria-label="Refresh stats">
            <RefreshIcon sx={refreshing ? { animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } } : undefined} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Open</Typography>
          <Typography variant="h6">{openCount}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Active</Typography>
          <Typography variant="h6">{performanceMetrics.activeRequests}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Completed Today</Typography>
          <Typography variant="h6">{performanceMetrics.completedToday}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Completed This Week</Typography>
          <Typography variant="h6">{performanceMetrics.completedThisWeek}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Avg Resolution Time</Typography>
          <Typography variant="h6">{formatMinutes(performanceMetrics.averageResolutionMinutes)}</Typography>
        </Paper>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell align="right">Open</TableCell>
              <TableCell align="right">In Progress</TableCell>
              <TableCell align="right">Completed</TableCell>
              <TableCell align="right">Oldest Open</TableCell>
              <TableCell align="right">Avg Resolution</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTypes.map(({ key }) => {
              const typeRow = byType(requestsByType, key);
              const openRow = byType(openRequestsByType, key);
              const resolutionRow = byType(averageResolutionTime, key);
              return (
                <TableRow key={key}>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {TYPE_ICONS[key]}
                      {TYPE_LABELS[key]}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{typeRow?.open ?? 0}</TableCell>
                  <TableCell align="right">{typeRow?.inProgress ?? 0}</TableCell>
                  <TableCell align="right">{typeRow?.completed ?? 0}</TableCell>
                  <TableCell align="right">{formatHours(openRow?.averageAgeHours ?? 0)}</TableCell>
                  <TableCell align="right">{formatMinutes(resolutionRow?.averageMinutes ?? 0)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {completedByDay.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell colSpan={2}>Completed, Last 5 Days</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {completedByDay.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell align="right">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function StatsPageWithAuth() {
  return (
    <WithAuth>
      <StatsPage />
    </WithAuth>
  );
}

export default StatsPageWithAuth;
