"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { usePermissions } from '@/contexts/PermissionsContext';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Grid,
  Chip,
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
  Inbox as OpenIcon,
  Bolt as ActiveIcon,
  CheckCircle as CompletedIcon,
  Schedule as ResolutionIcon,
  CheckCircleOutlined as GoodIcon,
  WarningAmberRounded as WarningIcon,
  ErrorOutlined as CriticalIcon,
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
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

// Thresholds are tuned to a ~4-5 day event, not a long-running deployment --
// a ticket sitting open for a few hours during a live event is already a
// meaningful chunk of the whole event's runway.
type BacklogStatus = 'good' | 'warning' | 'critical';
function backlogStatus(hours: number): BacklogStatus {
  if (hours > 4) return 'critical';
  if (hours > 1) return 'warning';
  return 'good';
}

const STATUS_CONFIG: Record<BacklogStatus, { color: 'success' | 'warning' | 'error'; icon: React.ReactElement; variant: 'outlined' | 'filled' }> = {
  good: { color: 'success', icon: <GoodIcon />, variant: 'outlined' },
  warning: { color: 'warning', icon: <WarningIcon />, variant: 'filled' },
  critical: { color: 'error', icon: <CriticalIcon />, variant: 'filled' },
};

function OldestOpenChip({ hours }: { hours: number }) {
  if (!hours) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const status = backlogStatus(hours);
  const { color, icon, variant } = STATUS_CONFIG[status];
  return <Chip size="small" color={color} icon={icon} label={formatHours(hours)} variant={variant} />;
}

function StatTile({ icon, label, value }: { icon: React.ReactElement; label: string; value: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{value}</Typography>
      </Box>
    </Paper>
  );
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

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile icon={<OpenIcon />} label="Open" value={openCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile icon={<ActiveIcon />} label="Active" value={performanceMetrics.activeRequests} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile icon={<CompletedIcon />} label="Completed today" value={performanceMetrics.completedToday} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile icon={<CompletedIcon />} label="Completed total" value={performanceMetrics.totalCompleted} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
          <StatTile icon={<ResolutionIcon />} label="Avg resolution" value={formatMinutes(performanceMetrics.averageResolutionMinutes)} />
        </Grid>
      </Grid>

      {(() => {
        const typeRows = visibleTypes.map(({ key }) => ({
          key,
          typeRow: byType(requestsByType, key),
          openRow: byType(openRequestsByType, key),
          resolutionRow: byType(averageResolutionTime, key),
        }));

        return (
          <>
            {/* Table, sm and up -- five numeric columns don't fit a phone width */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, display: { xs: 'none', sm: 'block' } }}>
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
                  {typeRows.map(({ key, typeRow, openRow, resolutionRow }) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          {TYPE_ICONS[key]}
                          {TYPE_LABELS[key]}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.open ?? 0}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.inProgress ?? 0}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.completed ?? 0}</TableCell>
                      <TableCell align="right"><OldestOpenChip hours={openRow?.averageAgeHours ?? 0} /></TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatMinutes(resolutionRow?.averageMinutes ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Stacked cards, below sm -- same data, one type per card */}
            <Stack spacing={1.5} sx={{ mb: 4, display: { xs: 'flex', sm: 'none' } }}>
              {typeRows.map(({ key, typeRow, openRow, resolutionRow }) => (
                <Paper key={key} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    {TYPE_ICONS[key]}
                    <Typography variant="subtitle2">{TYPE_LABELS[key]}</Typography>
                  </Stack>
                  <Grid container spacing={1}>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Open</Typography>
                      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.open ?? 0}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>In Progress</Typography>
                      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.inProgress ?? 0}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Completed</Typography>
                      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{typeRow?.completed ?? 0}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Oldest Open</Typography>
                      <OldestOpenChip hours={openRow?.averageAgeHours ?? 0} />
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Avg Resolution</Typography>
                      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatMinutes(resolutionRow?.averageMinutes ?? 0)}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </>
        );
      })()}

      {completedByDay.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell colSpan={2}>Completed by Day</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {completedByDay.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.count}</TableCell>
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
