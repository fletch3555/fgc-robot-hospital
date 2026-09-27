"use client";

import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  FormControlLabel,
  Checkbox,
  Stack,
  TextField,
  Chip,
  Paper,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { IRequest, IBatteryUnit, BatteryChargingRequestData, BatteryDeviceType, RequestType } from '@/lib/types';
import { getCountryName } from '@/lib/countryUtils';
import CountryFlag from '@/components/common/CountryFlag';
import { formatRequestDate } from '@/lib/dateUtils';
import RequestFormModal from '@/components/requests/RequestFormModal';
import { PermissionName } from '@/lib/auth-types';
import { usePermissions } from '@/contexts/PermissionsContext';

const DEVICE_LABELS: Record<string, string> = {
  robot_controller: 'Robot Controller',
  driver_hub: 'Driver Hub',
};

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

interface RequestTypeViewProps {
  type: RequestType;
  title: string;
  icon: React.ReactElement;
}

// Shared view for a single request type's own page (e.g. /requests/hardware).
// Each type gets its own route/nav entry rather than one page with tabs.
// battery_charging gets its own simpler rendering throughout -- it's a quick
// physical exchange (no assignee, no comments, nothing to edit once
// created), not a worked ticket like the other three types.
export default function RequestTypeView({ type, title, icon }: RequestTypeViewProps) {
  const { fetchWithAuth, isAuthenticated, isLoading, session } = useAuthenticatedFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<IRequest[]>([]);
  const [closedRequests, setClosedRequests] = useState<IRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IRequest | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [units, setUnits] = useState<IBatteryUnit[]>([]);
  const [newUnitNumber, setNewUnitNumber] = useState<Record<BatteryDeviceType, string>>({
    robot_controller: '',
    driver_hub: '',
  });
  const [returningId, setReturningId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const viewPermission = `${type}.view` as PermissionName;
  const createPermission = `${type}.create` as PermissionName;
  const isBatteryCharging = type === 'battery_charging';
  const canSeeBatteryPool = isBatteryCharging && hasPermission('battery_charging.view');

  const fetchUnits = async () => {
    try {
      const response = await fetchWithAuth('/api/requests/battery-units');
      if (response.ok) setUnits(await response.json());
    } catch (err) {
      console.error('Failed to load battery units:', err);
    }
  };

  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetchWithAuth("/api/requests");
        if (!response.ok) {
          throw new Error("Failed to fetch requests");
        }
        const data = await response.json();
        setRequests((data.active || []).filter((r: IRequest) => r.type === type));
        setClosedRequests((data.closed || []).filter((r: IRequest) => r.type === type));
      } catch (err) {
        setError("Failed to load requests");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchRequests();
      // Auto-refresh every 2 minutes
      const interval = setInterval(fetchRequests, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchWithAuth, type]);

  useEffect(() => {
    if (isAuthenticated && canSeeBatteryPool) {
      fetchUnits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canSeeBatteryPool]);

  const handleAddUnit = async (deviceType: BatteryDeviceType) => {
    const number = parseInt(newUnitNumber[deviceType], 10);
    if (isNaN(number) || number <= 0) return;

    try {
      const response = await fetchWithAuth('/api/requests/battery-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceType, number }),
      });
      if (response.ok) {
        setUnits(await response.json());
        setNewUnitNumber((prev) => ({ ...prev, [deviceType]: '' }));
      }
    } catch (err) {
      console.error('Failed to add battery unit:', err);
    }
  };

  const handleRemoveUnit = async (deviceType: BatteryDeviceType, number: number) => {
    try {
      const response = await fetchWithAuth('/api/requests/battery-units', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceType, number }),
      });
      if (response.ok) setUnits(await response.json());
    } catch (err) {
      console.error('Failed to remove battery unit:', err);
    }
  };

  const requestSortComparator = (a: IRequest, b: IRequest) => {
    const statusOrder = { 'in-progress': 1, 'open': 2, 'completed': 3, 'cancelled': 3 };
    const aOrder = statusOrder[a.status] || 3;
    const bOrder = statusOrder[b.status] || 3;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    // If same status, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const handleOpenCreateModal = () => {
    setSelectedRequest(null);
    setFormModalOpen(true);
  };

  // Support deep-linking straight into the create modal (e.g. from a
  // Sidebar nav link) via /requests/<type>?new=true.
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleOpenCreateModal();
      router.replace(window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleEditRequest = (request: IRequest, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from triggering
    setSelectedRequest(request);
    setFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setFormModalOpen(false);
    setSelectedRequest(null);
  };

  const handleRequestCreated = (newRequest: IRequest) => {
    setRequests(prev => [newRequest, ...prev].sort(requestSortComparator));
    if (newRequest.type === 'battery_charging') fetchUnits();
  };

  const handleRequestUpdated = (updatedRequest: IRequest) => {
    setRequests(prev => {
      // If request is completed, remove it from active list
      if (updatedRequest.status === 'completed') {
        // Add to closed requests at the beginning
        setClosedRequests(prevClosed => {
          const newClosed = [updatedRequest, ...prevClosed];
          // Keep only the last 10
          return newClosed.slice(0, 10);
        });
        return prev.filter(req => req.id !== updatedRequest.id);
      }
      // Otherwise, update the request in the list and re-sort
      const updated = prev.map(req => req.id === updatedRequest.id ? updatedRequest : req);
      return updated.sort(requestSortComparator);
    });
  };

  // One-click return for battery_charging -- no edit modal involved.
  const handleReturn = async (id: string) => {
    setReturningId(id);
    try {
      const response = await fetchWithAuth(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) throw new Error('Failed to mark request as returned');
      const updated = await response.json();
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setClosedRequests((prev) => [updated, ...prev].slice(0, 10));
      fetchUnits();
    } catch (err) {
      console.error(err);
      setError('Failed to mark request as returned');
    } finally {
      setReturningId(null);
    }
  };

  // Apply "Only mine" filter if enabled
  let filteredRequests = requests;
  if (showOnlyMine && session?.user?.id) {
    filteredRequests = filteredRequests.filter(request => request.assigned_to === session.user.id);
  }

  // Separate pending (open and unassigned) from other active requests --
  // meaningless for battery_charging, which never has an assignee or a
  // status other than open/completed.
  const pendingRequests = filteredRequests.filter(
    request => request.status === 'open' && !request.assigned_to
  );
  const activeAssignedRequests = filteredRequests.filter(
    request => request.status === 'in-progress' || (request.status === 'open' && request.assigned_to)
  );

  // Oldest-first so whoever's working the physical queue handles the
  // longest-waiting team next, rather than newest-first (used elsewhere for
  // status-grouped queues where recency is more useful than fairness).
  const batteryOutstanding = [...filteredRequests].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (isLoading || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!hasPermission(viewPermission)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">You don&apos;t have access to the {title.toLowerCase()}.</Alert>
      </Container>
    );
  }

  const renderBatteryChargingRow = (request: IRequest, showReturnButton: boolean) => {
    const data = request.battery_charging_data as BatteryChargingRequestData | undefined;
    const deviceLabel = data?.batteryType ? DEVICE_LABELS[data.batteryType] : '';
    return (
      <Paper key={request.id} variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CountryFlag code={request.country_code} size={20} />
            <Box>
              <Typography variant="body1">
                {getCountryName(request.country_code)}
                {deviceLabel && ` — ${deviceLabel}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRequestDate(request.updated_at || request.created_at)}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {data?.loanerBatteryNumber ? (
              <Chip size="small" color="primary" variant="outlined" label={`Loaner #${data.loanerBatteryNumber}`} />
            ) : (
              <Chip size="small" variant="outlined" label="No loaner" />
            )}
            {showReturnButton && hasPermission('battery_charging.return') && (
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CheckCircleIcon />}
                disabled={returningId === request.id}
                onClick={() => handleReturn(request.id)}
              >
                Return
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    );
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            {title}
          </Typography>
          {hasPermission(createPermission) && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenCreateModal}
              sx={{ flexShrink: 0 }}
            >
              New Request
            </Button>
          )}
        </Box>

        {/* Filter Controls */}
        {!isBatteryCharging && (
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyMine}
                  onChange={(e) => setShowOnlyMine(e.target.checked)}
                  color="primary"
                />
              }
              label="Only mine"
            />
          </Box>
        )}

        {/* Loaner Pool — only relevant for Battery Charging */}
        {canSeeBatteryPool && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                Loaner Pool
              </Typography>
              <Stack direction="row" spacing={2.5} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }} />
                  <Typography variant="caption" color="text.secondary">Available</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary">Checked out (team shown on tile)</Typography>
                </Stack>
              </Stack>
              <Stack spacing={2}>
                {DEVICE_TYPES.map((deviceType) => {
                  const unitsForType = units
                    .filter((u) => u.device_type === deviceType)
                    .sort((a, b) => a.number - b.number);
                  const availableCount = unitsForType.filter((u) => u.status === 'available').length;
                  return (
                    <Box key={deviceType}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                        {DEVICE_LABELS[deviceType]} ({availableCount}/{unitsForType.length} available)
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                          gap: 0.75,
                          maxHeight: 216,
                          overflowY: unitsForType.length > 48 ? 'auto' : 'visible',
                          pr: unitsForType.length > 48 ? 0.5 : 0,
                        }}
                      >
                        {unitsForType.map((unit) => {
                          const checkedOut = unit.status !== 'available';
                          const canRemove = !checkedOut && hasPermission('battery_charging.configure');
                          const tile = (
                            <Box
                              sx={{
                                position: 'relative',
                                height: 36,
                                gridColumn: checkedOut ? 'span 2' : undefined,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                                px: 0.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: checkedOut ? 'warning.main' : 'divider',
                                bgcolor: checkedOut ? 'warning.light' : 'transparent',
                                fontSize: 13,
                                fontWeight: 600,
                                '&:hover .remove-unit-btn': { opacity: 1 },
                              }}
                            >
                              {checkedOut ? (
                                <>
                                  <CountryFlag code={unit.country_code} size={14} />
                                  <span>#{unit.number}</span>
                                  <Typography component="span" variant="caption" sx={{ fontWeight: 400, opacity: 0.85 }}>
                                    {unit.country_code}
                                  </Typography>
                                </>
                              ) : (
                                `#${unit.number}`
                              )}
                              {canRemove && (
                                <IconButton
                                  size="small"
                                  className="remove-unit-btn"
                                  aria-label={`Remove ${DEVICE_LABELS[deviceType]} #${unit.number}`}
                                  onClick={() => handleRemoveUnit(deviceType, unit.number)}
                                  sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    p: 0.25,
                                    opacity: 0,
                                    transition: 'opacity 0.15s',
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'error.light' },
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                              )}
                            </Box>
                          );
                          return checkedOut ? (
                            <Tooltip
                              key={unit.number}
                              title={
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                  <CountryFlag code={unit.country_code} size={14} />
                                  <span>{unit.country_name || unit.country_code}</span>
                                </Stack>
                              }
                            >
                              {tile}
                            </Tooltip>
                          ) : (
                            <Box key={unit.number}>{tile}</Box>
                          );
                        })}
                      </Box>
                      {hasPermission('battery_charging.configure') && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="#"
                            value={newUnitNumber[deviceType]}
                            onChange={(e) => setNewUnitNumber((prev) => ({ ...prev, [deviceType]: e.target.value }))}
                            slotProps={{ htmlInput: { min: 1 } }}
                            sx={{ width: 80 }}
                          />
                          <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddUnit(deviceType)}>
                            Add
                          </Button>
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {isBatteryCharging ? (
          <>
            {/* Outstanding battery_charging requests — simple list, one-click return */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Outstanding
              </Typography>
              {batteryOutstanding.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Nothing outstanding.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {batteryOutstanding.map((request) => renderBatteryChargingRow(request, true))}
                </Stack>
              )}
            </Box>

            {/* Recently Closed */}
            {closedRequests.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2 }}>
                  Recently Closed Queue
                </Typography>
                <Stack spacing={1.5}>
                  {closedRequests.map((request) => renderBatteryChargingRow(request, false))}
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <>
            {/* Pending Queue Section */}
            {pendingRequests.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2 }}>
                  Pending Queue (Unassigned)
                </Typography>
                <Grid container spacing={3}>
                  {pendingRequests.map((request) => (
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={request.id}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                          border: '2px solid',
                          borderColor: 'error.main',
                          "&:hover": {
                            boxShadow: 6,
                          },
                        }}
                        onClick={(e) => handleEditRequest(request, e)}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CountryFlag code={request.country_code} size={16} />
                            {getCountryName(request.country_code)}
                          </Typography>
                          {request.comments && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {request.comments.length > 100
                                ? `${request.comments.substring(0, 100)}...`
                                : request.comments}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mt: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: (theme) => theme.palette.error.light,
                                color: (theme) => theme.palette.error.dark,
                              }}
                            >
                              OPEN - UNASSIGNED
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRequestDate(request.created_at)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Active Assigned Requests Section */}
            {activeAssignedRequests.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2 }}>
                  Active Queue
                </Typography>
                <Grid container spacing={3}>
                  {activeAssignedRequests.map((request) => (
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={request.id}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                          "&:hover": {
                            boxShadow: 6,
                          },
                        }}
                        onClick={(e) => handleEditRequest(request, e)}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CountryFlag code={request.country_code} size={16} />
                            {getCountryName(request.country_code)}
                          </Typography>
                          {request.assigned_to_name && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Assigned to: {request.assigned_to_name}
                            </Typography>
                          )}
                          {request.comments && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {request.comments.length > 100
                                ? `${request.comments.substring(0, 100)}...`
                                : request.comments}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mt: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: (theme) => {
                                  switch (request.status) {
                                    case "open":
                                      return theme.palette.error.light;
                                    case "in-progress":
                                      return theme.palette.warning.light;
                                    case "completed":
                                      return theme.palette.success.light;
                                    default:
                                      return theme.palette.grey[300];
                                  }
                                },
                                color: (theme) => {
                                  switch (request.status) {
                                    case "open":
                                      return theme.palette.error.dark;
                                    case "in-progress":
                                      return theme.palette.warning.dark;
                                    case "completed":
                                      return theme.palette.success.dark;
                                    default:
                                      return theme.palette.grey[900];
                                  }
                                },
                              }}
                            >
                              {request.status.toUpperCase()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRequestDate(request.created_at)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* No requests message */}
            {filteredRequests.length === 0 && (
              <Box sx={{ mb: 4, textAlign: "center", py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No {title.toLowerCase()} found
                </Typography>
              </Box>
            )}

            {/* Recently Closed Queue Section */}
            {closedRequests.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2 }}>
                  Recently Closed Queue
                </Typography>
                <Grid container spacing={3}>
                  {closedRequests.map((request) => (
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={request.id}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                          opacity: 0.8,
                          "&:hover": {
                            boxShadow: 6,
                            opacity: 1,
                          },
                        }}
                        onClick={(e) => handleEditRequest(request, e)}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CountryFlag code={request.country_code} size={16} />
                            {getCountryName(request.country_code)}
                          </Typography>
                          {request.assigned_to_name && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Assigned to: {request.assigned_to_name}
                            </Typography>
                          )}
                          {request.comments && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {request.comments.length > 100
                                ? `${request.comments.substring(0, 100)}...`
                                : request.comments}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mt: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: (theme) => theme.palette.success.light,
                                color: (theme) => theme.palette.success.dark,
                              }}
                            >
                              COMPLETED
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRequestDate(request.updated_at || request.created_at)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}
      </Container>

      <RequestFormModal
        open={formModalOpen}
        onClose={handleCloseFormModal}
        request={selectedRequest}
        onRequestUpdated={handleRequestUpdated}
        onRequestCreated={handleRequestCreated}
        fixedType={type}
      />
    </>
  );
}
