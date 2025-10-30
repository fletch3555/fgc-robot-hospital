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
  Divider,
  type GridProps,
} from '@mui/material';

// MUI Icons
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
  InventoryRounded,
  AssignmentTurnedInRounded,
  TrendingUpRounded,
  AccessTimeRounded,
  // PriorityHighRounded,
} from '@mui/icons-material';

// Project Components
import { AnalyticsWidget } from '@/components/dashboard/AnalyticsWidget';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { PermissionName } from '@/lib/auth-types';

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

interface AnalyticsData {
  requestsByStatus: Array<{
    status: string;
    total: number;
    today: number;
    thisWeek: number;
  }>;
  requestsByType: Array<{
    type: string;
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    todayCount: number;
  }>;
  dailyCompletions: {
    today: number;
    last7Days: Array<{
      date: string;
      count: number;
    }>;
  };
  openRequestsByType: Array<{
    type: string;
    count: number;
    averageAgeHours: number;
  }>;
  sparePartsStats: {
    totalIssued: number;
    totalReturned: number;
    currentlyLoaned: number;
    pendingRequests: number;
    byCategory: Array<{
      category: string;
      issued: number;
      returned: number;
      pending: number;
    }>;
  };
  performanceMetrics: {
    totalCompleted: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    activeRequests: number;
    averageResolutionMinutes: number;
  };
  averageResolutionTime: Array<{
    type: string;
    averageMinutes: number;
    completedCount: number;
  }>;
  completedByDay: Array<{
    date: string;
    count: number;
  }>;
  // priorityDistribution: Array<{
  //   priority: string;
  //   total: number;
  //   open: number;
  //   inProgress: number;
  // }>;
}

function Home() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [requestsResponse, /*sparePartsResponse,*/ analyticsResponse] = await Promise.all([
        fetchWithAuth('/api/dashboard?dashboard=true'),
        // fetchWithAuth('/api/spare-parts?dashboard=true'),
        fetchWithAuth('/api/dashboard/analytics')
      ]);
      
      if (!requestsResponse.ok || /*!sparePartsResponse.ok ||*/ !analyticsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const requestsData: {
        hardware: DashboardData['hardware'];
        software: DashboardData['software'];
        machine_shop: DashboardData['machine_shop'];
        battery_charging: DashboardData['battery_charging'];
        recentRequests: IRequest[];
      } = await requestsResponse.json();

      // const sparePartsData: {
      //   counts: DashboardData['spare_parts'];
      //   overdueLoans: DashboardData['overdueLoans'];
      // } = await sparePartsResponse.json();

      const analyticsInfo: AnalyticsData = await analyticsResponse.json();

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
        //   ...sparePartsData?.counts
        },
        recentRequests: requestsData?.recentRequests || [],
        overdueLoans: []//sparePartsData?.overdueLoans || []
      });

      setAnalyticsData(analyticsInfo);
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

  if (!dashboardData || !analyticsData) return null;

  // Calculate trend data for analytics widgets
  const totalOpenRequests = analyticsData.requestsByStatus?.find(s => s.status === 'open')?.total || 0;
  const completedToday = analyticsData.dailyCompletions?.today || 0;
  const yesterdayCompletions = analyticsData.dailyCompletions?.last7Days?.[1]?.count || 0;
  const dailyChange = completedToday - yesterdayCompletions;

  return (
    <Box sx={{ py: 4 }}>
      {/* Analytics Overview Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Robot Hospital Dashboard
        </Typography>
        <WithPermissions requiredAnyPermissions={['requests.view', 'spare_parts.view']}>
          <Typography variant="body1" color="text.secondary" paragraph>
            Comprehensive overview of support requests, spare parts, and operational metrics.
          </Typography>
          
          <GridContainer container spacing={3}>
            {/* Total Requests by Status */}
            <WithPermissions requiredPermissions={['requests.view']}>
              <GridItem size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticsWidget
                  title="Open Requests"
                  icon={<AssignmentTurnedInRounded />}
                  color="warning"
                  primaryMetric={{
                    value: totalOpenRequests,
                    label: "Total Open",
                    change: {
                      value: analyticsData.requestsByStatus?.find(s => s.status === 'open')?.today || 0,
                      direction: (analyticsData.requestsByStatus?.find(s => s.status === 'open')?.today || 0) > 0 ? 'up' : 'flat',
                      timeframe: "today"
                    }
                  }}
                  secondaryMetrics={[
                    {
                      value: analyticsData.performanceMetrics?.activeRequests || 0,
                      label: "Active (Open + In Progress)"
                    },
                    {
                      value: analyticsData.requestsByStatus?.find(s => s.status === 'open')?.thisWeek || 0,
                      label: "This Week"
                    }
                  ]}
                />
              </GridItem>
            </WithPermissions>

            {/* Completed Requests */}
            <WithPermissions requiredPermissions={['requests.view']}>
              <GridItem size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticsWidget
                  title="Completed Requests"
                  icon={<TrendingUpRounded />}
                  color="success"
                  primaryMetric={{
                    value: completedToday,
                    label: "Completed Today",
                    change: {
                      value: dailyChange,
                      direction: dailyChange > 0 ? 'up' : dailyChange < 0 ? 'down' : 'flat',
                      timeframe: "vs yesterday"
                    }
                  }}
                  secondaryMetrics={analyticsData.completedByDay?.slice(0, 5).map(day => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return {
                      value: day.count,
                      label: dayName
                    };
                  }) || []}
                />
              </GridItem>
            </WithPermissions>

            {/* Average Resolution Time */}
            <WithPermissions requiredPermissions={['requests.view']}>
              <GridItem size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticsWidget
                  title="Avg Resolution Time"
                  icon={<AccessTimeRounded />}
                  color="info"
                  primaryMetric={{
                    value: Math.round(analyticsData.performanceMetrics?.averageResolutionMinutes || 0),
                    label: "Avg Minutes"
                  }}
                  secondaryMetrics={analyticsData.averageResolutionTime?.map(type => ({
                    value: Math.round(type.averageMinutes),
                    label: `${type.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (${type.completedCount})`
                  }))}
                />
              </GridItem>
            </WithPermissions>

            {/* Spare Parts Status */}
            <WithPermissions requiredPermissions={['spare_parts.view']}>
              <GridItem size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticsWidget
                  title="Spare Parts"
                  icon={<InventoryRounded />}
                  color="secondary"
                  primaryMetric={{
                    value: analyticsData.sparePartsStats?.currentlyLoaned || 0,
                    label: "Currently Loaned"
                  }}
                  secondaryMetrics={[
                    {
                      value: analyticsData.sparePartsStats?.totalIssued || 0,
                      label: "Total Issued"
                    },
                    {
                      value: analyticsData.sparePartsStats?.totalReturned || 0,
                      label: "Total Returned"
                    }
                  ]}
                />
              </GridItem>
            </WithPermissions>
          </GridContainer>
        </WithPermissions>

        <WithPermissions requiredAnyPermissions={['hardware.view', 'software.view', 'machine_shop.view', 'requests.view']}>
          {analyticsData.requestsByType && analyticsData.requestsByType.length > 0 && (
          <>
            <Divider sx={{ my: 4 }} />

            {/* Request Type Breakdown */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Request Categories
              </Typography>
              
              <GridContainer container spacing={3}>
                {(analyticsData.requestsByType || []).map((typeData) => {
                  const icon = typeData.type === 'hardware' ? <BuildRounded /> :
                              typeData.type === 'software' ? <ComputerRounded /> :
                              typeData.type === 'machine_shop' ? <PrecisionManufacturingRounded /> :
                              <BatteryChargingFullRounded />;
                  
                  const color: 'primary' | 'secondary' | 'warning' | 'info' = typeData.type === 'hardware' ? 'primary' :
                              typeData.type === 'software' ? 'secondary' :
                              typeData.type === 'machine_shop' ? 'warning' : 'info';

                  // Map request types to their specific permissions
                  const typePermissions: Record<string, PermissionName> = {
                    'hardware': 'hardware.view',
                    'software': 'software.view', 
                    'machine_shop': 'machine_shop.view',
                    'battery_charging': 'battery_charging.view'
                  };

                  const requiredPermission = typePermissions[typeData.type] || 'requests.view' as PermissionName;

                  return (
                    <WithPermissions requiredPermissions={[requiredPermission]} key={typeData.type}>
                      <GridItem size={{ xs: 12, sm: 6, lg: 3 }}>
                        <AnalyticsWidget
                          title={typeData.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          icon={icon}
                          color={color}
                          primaryMetric={{
                            value: typeData.open,
                            label: "Open Requests",
                            change: {
                              value: typeData.todayCount,
                              direction: typeData.todayCount > 0 ? 'up' : 'flat',
                              timeframe: "today"
                            }
                          }}
                          secondaryMetrics={[
                            {
                              value: typeData.inProgress,
                              label: "In Progress"
                            },
                            {
                              value: typeData.completed,
                              label: "Completed"
                            },
                            {
                              value: typeData.total,
                              label: "Total Requests"
                            }
                          ]}
                        />
                      </GridItem>
                    </WithPermissions>
                  );
                })}
              </GridContainer>
            </Box>
          </>
          )}
        </WithPermissions>

        {/* <WithPermissions requiredPermissions={['requests.view']}>
          {analyticsData.priorityDistribution && analyticsData.priorityDistribution.length > 0 && (
          <>
            <Divider sx={{ my: 4 }} />

            {/* Priority Distribution * /}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Priority Breakdown
              </Typography>
              
              <GridContainer container spacing={3}>
                {(analyticsData.priorityDistribution || []).map((priority) => {
                  const color: 'error' | 'warning' | 'info' | 'success' = priority.priority === 'urgent' ? 'error' :
                                priority.priority === 'high' ? 'warning' :
                                priority.priority === 'medium' ? 'info' : 'success';

                  return (
                    <GridItem size={{ xs: 12, sm: 6, md: 3 }} key={priority.priority}>
                      <AnalyticsWidget
                        title={`${priority.priority.charAt(0).toUpperCase() + priority.priority.slice(1)} Priority`}
                        icon={<PriorityHighRounded />}
                        color={color}
                        primaryMetric={{
                          value: priority.total,
                          label: "Total Requests"
                        }}
                        secondaryMetrics={[
                          {
                            value: priority.open,
                            label: "Open"
                          },
                          {
                            value: priority.inProgress,
                            label: "In Progress"
                          }
                        ]}
                      />
                    </GridItem>
                  );
                })}
              </GridContainer>
            </Box>
          </>
          )}
        </WithPermissions> */}

        <WithPermissions requiredAnyPermissions={['hardware.view', 'software.view', 'machine_shop.view', 'requests.view']}>
          <Divider sx={{ my: 4 }} />

          {/* Original Request Categories - Detailed View */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Detailed Request Tracking
            </Typography>
            <GridContainer container spacing={3}>
              <WithPermissions requiredPermissions={['hardware.view']}>
                {/* Hardware Support */}
                <GridItem size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card>
                    <CardHeader
                      avatar={<BuildRounded />}
                      title="Hardware Support"
                      action={
                        <Chip
                          label={`${dashboardData.hardware.pending} Unassigned`}
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
              </WithPermissions>

              <WithPermissions requiredPermissions={['software.view']}>
                {/* Software Support */}
                <GridItem size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card>
                    <CardHeader
                      avatar={<ComputerRounded />}
                      title="Software Support"
                      action={
                        <Chip
                          label={`${dashboardData.software.pending} Unassigned`}
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
              </WithPermissions>

              <WithPermissions requiredPermissions={['machine_shop.view']}>
                {/* Machine Shop */}
                <GridItem size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card>
                    <CardHeader
                      avatar={<PrecisionManufacturingRounded />}
                      title="Machine Shop"
                      action={
                        <Chip
                          label={`${dashboardData.machine_shop.pending} Unassigned`}
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
              </WithPermissions>

              <WithPermissions requiredPermissions={['requests.view']}>
                {/* Battery Charging & Spare Parts Combined */}
                <GridItem size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card>
                    <CardHeader
                      avatar={<BatteryChargingFullRounded />}
                      title="Battery & Parts"
                      action={
                        <Chip
                          label={`${dashboardData.battery_charging.pending + dashboardData.spare_parts.pending} Unassigned`}
                          color="warning"
                          size="small"
                        />
                      }
                    />
                    <CardContent>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Batteries Charging"
                            secondary={dashboardData.battery_charging.in_progress}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Parts Loaned"
                            secondary={dashboardData.spare_parts.issued}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </GridItem>
              </WithPermissions>
            </GridContainer>
          </Box>
        </WithPermissions>

        <WithPermissions requiredAnyPermissions={['hardware.view', 'software.view', 'machine_shop.view', 'requests.view']}>
          <Divider sx={{ my: 4 }} />

          {/* Detailed Request Lists */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Active Request Details
            </Typography>
            <GridContainer container spacing={3}>
              {/* Hardware/Software Support Requests */}
              <WithPermissions requiredPermissions={['hardware.view']}>
                <GridItem size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardHeader
                      avatar={<BuildRounded />}
                      title="Hardware Support Requests"
                      subheader="Unassigned and In-Progress"
                    />
                    <CardContent>
                      {dashboardData.hardware.requests.length > 0 ? (
                        <List>
                          {dashboardData.hardware.requests.slice(0, 5).map((request: IRequest) => (
                            <ListItem key={request.id}>
                              <ListItemText
                                primary={request.comments || 'No description'}
                                // secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()} • Priority: ${request.priority.toUpperCase()}`}
                                secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()}`}
                              />
                            </ListItem>
                          ))}
                          {dashboardData.hardware.requests.length > 5 && (
                            <ListItem>
                              <ListItemText 
                                secondary={`... and ${dashboardData.hardware.requests.length - 5} more requests`}
                              />
                            </ListItem>
                          )}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No unassigned or in-progress hardware requests
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </GridItem>
              </WithPermissions>

              <WithPermissions requiredPermissions={['software.view']}>
                <GridItem size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardHeader
                      avatar={<ComputerRounded />}
                      title="Software Support Requests"
                      subheader="Unassigned and In-Progress"
                    />
                    <CardContent>
                      {dashboardData.software.requests.length > 0 ? (
                        <List>
                          {dashboardData.software.requests.slice(0, 5).map((request: IRequest) => (
                            <ListItem key={request.id}>
                              <ListItemText
                                primary={request.comments || 'No description'}
                                // secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()} • Priority: ${request.priority.toUpperCase()}`}
                                secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()}`}
                              />
                            </ListItem>
                          ))}
                          {dashboardData.software.requests.length > 5 && (
                            <ListItem>
                              <ListItemText 
                                secondary={`... and ${dashboardData.software.requests.length - 5} more requests`}
                              />
                            </ListItem>
                          )}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No unassigned or in-progress software requests
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </GridItem>
              </WithPermissions>

              {/* Battery Charging Requests */}
              <WithPermissions requiredPermissions={['requests.view']}>
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
                          {dashboardData.battery_charging.requests.slice(0, 5).map((request: IRequest) => (
                            <ListItem key={request.id}>
                              <ListItemText
                                primary={request.comments || 'Battery charging request'}
                                // secondary={`Status: ${request.status === 'in-progress' ? 'CHARGING' : request.status.toUpperCase()} • Priority: ${request.priority.toUpperCase()}`}
                                secondary={`Status: ${request.status === 'in-progress' ? 'CHARGING' : request.status.toUpperCase()}`}
                              />
                            </ListItem>
                          ))}
                          {dashboardData.battery_charging.requests.length > 5 && (
                            <ListItem>
                              <ListItemText 
                                secondary={`... and ${dashboardData.battery_charging.requests.length - 5} more requests`}
                              />
                            </ListItem>
                          )}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No batteries currently charging or recently completed
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </GridItem>
              </WithPermissions>

              {/* Machine Shop Requests */}
              <WithPermissions requiredPermissions={['machine_shop.view']}>
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
                          {dashboardData.machine_shop.requests.slice(0, 5).map((request: IRequest) => (
                            <ListItem key={request.id}>
                              <ListItemText
                                primary={request.comments || 'Machine shop request'}
                                // secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()} • Priority: ${request.priority.toUpperCase()}`}
                                secondary={`Status: ${request.status.replace('_', ' ').toUpperCase()}`}
                              />
                            </ListItem>
                          ))}
                          {dashboardData.machine_shop.requests.length > 5 && (
                            <ListItem>
                              <ListItemText 
                                secondary={`... and ${dashboardData.machine_shop.requests.length - 5} more requests`}
                              />
                            </ListItem>
                          )}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No active machine shop requests
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </GridItem>
              </WithPermissions>
            </GridContainer>
          </Box>
        </WithPermissions>
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
