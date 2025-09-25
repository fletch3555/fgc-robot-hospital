"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';

// MUI Components
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  type GridProps,
} from '@mui/material';

// MUI Icons
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
  InventoryRounded,
} from '@mui/icons-material';

// Project Types
import { IRequest } from '@/lib/types';

// Create type-safe Grid wrappers to fix TypeScript component issues
const GridContainer = (props: GridProps) => <Grid component="div" {...props} />;
const GridItem = (props: GridProps) => <Grid component="div" {...props} />;

interface DashboardData {
  hardware: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    requests: Array<IRequest>; // Pending and in-progress requests
  };
  software: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    requests: Array<IRequest>; // Pending and in-progress requests
  };
  machine_shop: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    requests: Array<IRequest>; // All requests with status
  };
  battery_charging: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    requests: Array<IRequest>; // Charging and complete requests
  };
  spare_parts: {
    pending: number;
    issued: number;
    returned: number;
    denied: number;
  };
  recentRequests: Array<IRequest>;
  overdueLoans: Array<{
    _id: string;
    partName: string;
    countryCode: string;
    countryName: string;
    dueDate: Date;
  }>;
}

function Home() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [requestsResponse, sparePartsResponse] = await Promise.all([
        fetchWithAuth('/api/dashboard'),
        fetchWithAuth('/api/spare-parts-requests?dashboard=true')
      ]);
      
      if (!requestsResponse.ok || !sparePartsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const requestsData: {
        hardware: DashboardData['hardware'];
        software: DashboardData['software'];
        machine_shop: DashboardData['machine_shop'];
        battery_charging: DashboardData['battery_charging'];
        recentRequests: IRequest[];
      } = await requestsResponse.json();

      const sparePartsData: {
        counts: DashboardData['spare_parts'];
        overdueLoans: DashboardData['overdueLoans'];
      } = await sparePartsResponse.json();

      // Ensure we have default values for all required fields
      const defaultRequestCounts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        canceled: 0,
        requests: []
      };

      setDashboardData({
        hardware: { ...defaultRequestCounts, ...requestsData?.hardware },
        software: { ...defaultRequestCounts, ...requestsData?.software },
        machine_shop: { ...defaultRequestCounts, ...requestsData?.machine_shop },
        battery_charging: { ...defaultRequestCounts, ...requestsData?.battery_charging },
        spare_parts: {
          ...{
            pending: 0,
            issued: 0,
            returned: 0,
            denied: 0
          },
          ...sparePartsData?.counts
        },
        recentRequests: requestsData?.recentRequests || [],
        overdueLoans: sparePartsData?.overdueLoans || []
      });
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      // Refresh every 2 minutes (120 seconds)
      const interval = setInterval(fetchDashboardData, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchDashboardData]);

  if (isLoading || (isAuthenticated && loading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) return null;

  return (
    <Box sx={{ py: 4 }}>
        <GridContainer container spacing={3}>
          {/* Hardware Support */}
          <GridItem size={{ xs: 12, md: 4 }}>
            <Card>
              <CardHeader
                avatar={<BuildRounded />}
                title="Hardware Support"
                action={
                  <Chip
                    label={`${dashboardData.hardware.pending} Pending`}
                    color="warning"
                    size="small"
                  />
                }
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="In Progress"
                      secondary={dashboardData.hardware.in_progress}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completed Today"
                      secondary={dashboardData.hardware.completed}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </GridItem>

          {/* Software Support */}
          <GridItem size={{ xs: 12, md: 4 }}>
            <Card>
              <CardHeader
                avatar={<ComputerRounded />}
                title="Software Support"
                action={
                  <Chip
                    label={`${dashboardData.software.pending} Pending`}
                    color="warning"
                    size="small"
                  />
                }
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="In Progress"
                      secondary={dashboardData.software.in_progress}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completed Today"
                      secondary={dashboardData.software.completed}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </GridItem>

          {/* Machine Shop */}
          <GridItem size={{ xs: 12, md: 4 }}>
            <Card>
              <CardHeader
                avatar={<PrecisionManufacturingRounded />}
                title="Machine Shop"
                action={
                  <Chip
                    label={`${dashboardData.machine_shop.pending} Pending`}
                    color="warning"
                    size="small"
                  />
                }
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="In Progress"
                      secondary={dashboardData.machine_shop.in_progress}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completed Today"
                      secondary={dashboardData.machine_shop.completed}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </GridItem>

          {/* Battery Charging */}
          <GridItem size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader
                avatar={<BatteryChargingFullRounded />}
                title="Battery Charging"
                action={
                  <Chip
                    label={`${dashboardData.battery_charging.pending} Pending`}
                    color="warning"
                    size="small"
                  />
                }
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="In Progress"
                      secondary={dashboardData.battery_charging.in_progress}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completed Today"
                      secondary={dashboardData.battery_charging.completed}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </GridItem>

          {/* Spare Parts */}
          <GridItem size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader
                avatar={<InventoryRounded />}
                title="Spare Parts"
                action={
                  <Chip
                    label={`${dashboardData.spare_parts.pending} Pending`}
                    color="warning"
                    size="small"
                  />
                }
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Currently Loaned"
                      secondary={dashboardData.spare_parts.issued}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Overdue Returns"
                      secondary={dashboardData.overdueLoans.length}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </GridItem>
        </GridContainer>

        {/* Detailed Request Lists */}
        <Box sx={{ mt: 4 }}>
          <GridContainer container spacing={3}>
            {/* Hardware/Software Support Requests */}
            <GridItem size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader
                  avatar={<BuildRounded />}
                  title="Hardware Support Requests"
                  subheader="Pending and In-Progress"
                />
                <CardContent>
                  {dashboardData.hardware.requests.length > 0 ? (
                    <List>
                      {dashboardData.hardware.requests.map((request: IRequest) => (
                        <ListItem key={request.id}>
                          <ListItemText
                            primary={request.comments}
                            secondary={
                              <Box>
                                <Chip 
                                  label={request.status.replace('_', ' ').toUpperCase()} 
                                  color={request.status === 'open' ? 'warning' : 'info'}
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Chip 
                                  label={request.priority.toUpperCase()} 
                                  color={request.priority === 'urgent' ? 'error' : request.priority === 'high' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No pending or in-progress hardware requests
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridItem>

            <GridItem size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader
                  avatar={<ComputerRounded />}
                  title="Software Support Requests"
                  subheader="Pending and In-Progress"
                />
                <CardContent>
                  {dashboardData.software.requests.length > 0 ? (
                    <List>
                      {dashboardData.software.requests.map((request: IRequest) => (
                        <ListItem key={request.id}>
                          <ListItemText
                            primary={request.comments}
                            secondary={
                              <Box>
                                <Chip 
                                  label={request.status.replace('_', ' ').toUpperCase()} 
                                  color={request.status === 'open' ? 'warning' : 'info'}
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Chip 
                                  label={request.priority.toUpperCase()} 
                                  color={request.priority === 'urgent' ? 'error' : request.priority === 'high' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No pending or in-progress software requests
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridItem>

            {/* Battery Charging Requests */}
            <GridItem size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader
                  avatar={<BatteryChargingFullRounded />}
                  title="Battery Charging"
                  subheader="Charging and Complete"
                />
                <CardContent>
                  {dashboardData.battery_charging.requests.length > 0 ? (
                    <List>
                      {dashboardData.battery_charging.requests.map((request: IRequest) => (
                        <ListItem key={request.id}>
                          <ListItemText
                            primary={request.comments}
                            secondary={
                              <Box>
                                <Chip 
                                  label={request.status === 'in-progress' ? 'CHARGING' : request.status.toUpperCase()} 
                                  color={request.status === 'in-progress' ? 'warning' : 'success'}
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Chip 
                                  label={request.priority.toUpperCase()} 
                                  color={request.priority === 'urgent' ? 'error' : request.priority === 'high' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No batteries currently charging or recently completed
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridItem>

            {/* Machine Shop Requests */}
            <GridItem size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader
                  avatar={<PrecisionManufacturingRounded />}
                  title="Machine Shop Requests"
                  subheader="All Active Requests"
                />
                <CardContent>
                  {dashboardData.machine_shop.requests.length > 0 ? (
                    <List>
                      {dashboardData.machine_shop.requests.map((request: IRequest) => (
                        <ListItem key={request.id}>
                          <ListItemText
                            primary={request.comments}
                            secondary={
                              <Box>
                                <Chip 
                                  label={request.status.replace('_', ' ').toUpperCase()} 
                                  color={
                                    request.status === 'open' ? 'warning' : 
                                    request.status === 'in-progress' ? 'info' : 
                                    'success'
                                  }
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Chip 
                                  label={request.priority.toUpperCase()} 
                                  color={request.priority === 'urgent' ? 'error' : request.priority === 'high' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No active machine shop requests
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridItem>
          </GridContainer>
        </Box>
      </Box>
  );
}

// Wrap the component with authentication protection
function HomeWithAuth() {
  return (
    <WithAuth>
      <Home />
    </WithAuth>
  );
}

export default HomeWithAuth;
