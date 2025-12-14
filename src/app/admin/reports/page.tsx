'use client';

import { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Build as BuildIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

type ReportType = 'all' | 'requests' | 'spare_parts' | 'users' | 'teams' | 'summary';

interface ReportStats {
  [key: string]: string | number;
}

interface TeamActivity {
  country_code: string;
  request_count?: number;
  transaction_count?: number;
  total_quantity?: number;
}

interface PartFrequency {
  item_name: string;
  request_count: number;
  total_quantity: number;
}

interface TypeBreakdown {
  hardware_type?: string;
  language?: string;
  action?: string;
  battery_type?: string;
  count: number;
}

interface RequestAnalytics {
  mostHelpedTeams: TeamActivity[];
  leastHelpedTeams: TeamActivity[];
  hardwareTypes: TypeBreakdown[];
  softwareLanguages: TypeBreakdown[];
  machineShopActions: TypeBreakdown[];
  batteryTypes: TypeBreakdown[];
}

interface SparePartsAnalytics {
  mostRequestedParts: PartFrequency[];
  leastRequestedParts: PartFrequency[];
  mostHelpedTeams: TeamActivity[];
  leastHelpedTeams: TeamActivity[];
}

interface ReportSection {
  type: string;
  data: Record<string, unknown>[];
  stats?: ReportStats;
  count?: number;
  analytics?: RequestAnalytics | SparePartsAnalytics;
}

interface SummaryData {
  totals?: Record<string, number>;
  requestsByType?: Array<{ type: string; count: number }>;
  requestsByStatus?: Array<{ status: string; count: number }>;
  topCountries?: Array<{ country_code: string; request_count: number }>;
}

interface ReportData {
  type: string;
  data?: Record<string, unknown>[] | SummaryData;
  stats?: ReportStats;
  count?: number;
  analytics?: RequestAnalytics | SparePartsAnalytics;
  requests?: ReportSection;
  spareParts?: ReportSection;
  users?: ReportSection;
  teams?: ReportSection;
  summary?: ReportSection;
}

function AdminReports() {
  const { fetchWithAuth, isAuthenticated } = useAuthenticatedFetch();
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetchWithAuth(`/api/admin/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Error fetching report data');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, reportType, startDate, endDate]);

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
          return String(value).replace(/,/g, ';');
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = (data: unknown, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!reportData) return;

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (reportType === 'all') {
      // Export all reports
      if (format === 'json') {
        exportToJSON(reportData, `all_reports_${timestamp}`);
      } else {
        // Export each section as separate CSV
        if (reportData.requests?.data) exportToCSV(reportData.requests.data, `requests_${timestamp}`);
        if (reportData.spareParts?.data) exportToCSV(reportData.spareParts.data, `spare_parts_${timestamp}`);
        if (reportData.users?.data) exportToCSV(reportData.users.data, `users_${timestamp}`);
        if (reportData.teams?.data) exportToCSV(reportData.teams.data, `teams_${timestamp}`);
      }
    } else if (reportType === 'summary') {
      exportToJSON(reportData.data, `summary_${timestamp}`);
    } else {
      if (format === 'csv' && reportData.data && Array.isArray(reportData.data)) {
        exportToCSV(reportData.data, `${reportType}_${timestamp}`);
      } else {
        exportToJSON(reportData, `${reportType}_${timestamp}`);
      }
    }
  };

  const renderSummaryReport = (data: SummaryData | Record<string, unknown>[]) => {
    if (!data || Array.isArray(data)) return null;

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overview Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {data.totals?.requests || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Requests
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary">
                      {data.totals?.spareParts || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Spare Parts
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {data.totals?.users || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Users
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {data.totals?.teams || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Teams
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Requests by Type
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.requestsByType?.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell>
                          <Chip label={row.type} size="small" />
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Requests by Status
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.requestsByStatus?.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell>
                          <Chip 
                            label={row.status} 
                            size="small"
                            color={
                              row.status === 'completed' ? 'success' :
                              row.status === 'in-progress' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 10 Countries by Requests
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Country Code</TableCell>
                      <TableCell align="right">Request Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topCountries?.map((row) => (
                      <TableRow key={row.country_code}>
                        <TableCell>
                          <Chip label={row.country_code} />
                        </TableCell>
                        <TableCell align="right">{row.request_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderStatCard = (
    title: string,
    value: number | string,
    subtitle?: string,
    icon?: React.ReactNode,
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' = 'primary'
  ) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          {icon && <Box color={`${color}.main`}>{icon}</Box>}
        </Box>
        <Typography variant="h3" component="div" color={`${color}.main`}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderRequestsStats = (stats: ReportStats, analytics?: RequestAnalytics) => {
    const total = Number(stats.total || 0);
    const open = Number(stats.open || 0);
    const inProgress = Number(stats.in_progress || 0);
    const completed = Number(stats.completed || 0);
    
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const activeRate = total > 0 ? (((open + inProgress) / total) * 100).toFixed(1) : '0';

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h5" gutterBottom>
            Requests Analytics
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Total Requests', total, 'All time', <BuildIcon />, 'primary')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Open', open, `${activeRate}% of total`, <PendingIcon />, 'warning')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('In Progress', inProgress, 'Being worked on', <TrendingUpIcon />, 'info')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Completed', completed, `${completionRate}% completion rate`, <CheckCircleIcon />, 'success')}
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Request Status Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Completed</Typography>
                    <Typography variant="body2" fontWeight="bold">{completed} ({completionRate}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(completionRate)}
                    color="success"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">In Progress</Typography>
                    <Typography variant="body2" fontWeight="bold">{inProgress} ({total > 0 ? ((inProgress / total) * 100).toFixed(1) : 0}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total > 0 ? (inProgress / total) * 100 : 0}
                    color="info"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Open</Typography>
                    <Typography variant="body2" fontWeight="bold">{open} ({total > 0 ? ((open / total) * 100).toFixed(1) : 0}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total > 0 ? (open / total) * 100 : 0}
                    color="warning"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Request Types
              </Typography>
              <Box sx={{ mt: 2 }}>
                {['hardware', 'software', 'machine_shop', 'battery_charging'].map((type) => {
                  const count = Number(stats[type] || 0);
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Chip label={type.replace('_', ' ')} size="small" />
                        <Typography variant="body2">{count} ({percentage}%)</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Number(percentage)}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Completion Rate</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {completionRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Active Requests</Typography>
                  <Typography variant="body2" fontWeight="bold" color="info.main">
                    {open + inProgress}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Most Common Type</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {['hardware', 'software', 'machine_shop', 'battery_charging']
                      .reduce((max, type) => Number(stats[type] || 0) > Number(stats[max] || 0) ? type : max)
                      .replace('_', ' ')}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5}>
                  <Typography variant="body2">Average per Day</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {(total / 30).toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {analytics && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Most Helped Teams
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Requests</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.mostHelpedTeams.slice(0, 5).map((team) => (
                          <TableRow key={team.country_code}>
                            <TableCell>
                              <Chip label={team.country_code} size="small" color="success" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold">{team.request_count}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Least Helped Teams
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Requests</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.leastHelpedTeams.slice(0, 5).map((team) => (
                          <TableRow key={team.country_code}>
                            <TableCell>
                              <Chip label={team.country_code} size="small" color="warning" />
                            </TableCell>
                            <TableCell align="right">{team.request_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {analytics.hardwareTypes.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Hardware Request Types
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {analytics.hardwareTypes.map((item, idx) => {
                        const hwTotal = analytics.hardwareTypes.reduce((sum, t) => sum + Number(t.count), 0);
                        const percentage = hwTotal > 0 ? ((Number(item.count) / hwTotal) * 100).toFixed(1) : '0';
                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Chip label={item.hardware_type || 'Unknown'} size="small" />
                              <Typography variant="body2">{item.count} ({percentage}%)</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Number(percentage)}
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {analytics.softwareLanguages.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Software Languages
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {analytics.softwareLanguages.map((item, idx) => {
                        const swTotal = analytics.softwareLanguages.reduce((sum, t) => sum + Number(t.count), 0);
                        const percentage = swTotal > 0 ? ((Number(item.count) / swTotal) * 100).toFixed(1) : '0';
                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Chip label={item.language || 'Unknown'} size="small" />
                              <Typography variant="body2">{item.count} ({percentage}%)</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Number(percentage)}
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {analytics.machineShopActions.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Machine Shop Actions
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {analytics.machineShopActions.map((item, idx) => {
                        const msTotal = analytics.machineShopActions.reduce((sum, t) => sum + Number(t.count), 0);
                        const percentage = msTotal > 0 ? ((Number(item.count) / msTotal) * 100).toFixed(1) : '0';
                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Chip label={item.action || 'Unknown'} size="small" />
                              <Typography variant="body2">{item.count} ({percentage}%)</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Number(percentage)}
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {analytics.batteryTypes.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Battery Types
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {analytics.batteryTypes.map((item, idx) => {
                        const btTotal = analytics.batteryTypes.reduce((sum, t) => sum + Number(t.count), 0);
                        const percentage = btTotal > 0 ? ((Number(item.count) / btTotal) * 100).toFixed(1) : '0';
                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Chip label={item.battery_type || 'Unknown'} size="small" />
                              <Typography variant="body2">{item.count} ({percentage}%)</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Number(percentage)}
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </>
        )}
      </Grid>
    );
  };

  const renderSparePartsStats = (stats: ReportStats, analytics?: SparePartsAnalytics) => {
    const total = Number(stats.total || 0);
    const issued = Number(stats.issued || 0);
    const returned = Number(stats.returned || 0);
    const loans = Number(stats.loans || 0);
    const totalQuantity = Number(stats.total_quantity || 0);

    const returnRate = issued > 0 ? ((returned / issued) * 100).toFixed(1) : '0';
    const loanRate = total > 0 ? ((loans / total) * 100).toFixed(1) : '0';

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h5" gutterBottom>
            Spare Parts Analytics
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Total Transactions', total, 'All time', <BuildIcon />, 'primary')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Items Issued', issued, `${totalQuantity} total units`, <TrendingUpIcon />, 'info')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Items Returned', returned, `${returnRate}% return rate`, <CheckCircleIcon />, 'success')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {renderStatCard('Loans', loans, `${loanRate}% of total`, <PendingIcon />, 'warning')}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Issued</Typography>
                    <Typography variant="body2" fontWeight="bold">{issued} ({total > 0 ? ((issued / total) * 100).toFixed(1) : 0}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total > 0 ? (issued / total) * 100 : 0}
                    color="info"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Returned</Typography>
                    <Typography variant="body2" fontWeight="bold">{returned} ({total > 0 ? ((returned / total) * 100).toFixed(1) : 0}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total > 0 ? (returned / total) * 100 : 0}
                    color="success"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Return Rate</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {returnRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Loan Percentage</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    {loanRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">Total Units Distributed</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalQuantity}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1.5}>
                  <Typography variant="body2">Avg Units per Transaction</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {total > 0 ? (totalQuantity / total).toFixed(1) : '0'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {analytics && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Most Requested Parts
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Part Name</TableCell>
                          <TableCell align="right">Requests</TableCell>
                          <TableCell align="right">Total Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.mostRequestedParts.slice(0, 5).map((part, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {part.item_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={part.request_count} size="small" color="success" />
                            </TableCell>
                            <TableCell align="right">{part.total_quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Least Requested Parts
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Part Name</TableCell>
                          <TableCell align="right">Requests</TableCell>
                          <TableCell align="right">Total Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.leastRequestedParts.slice(0, 5).map((part, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2">
                                {part.item_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={part.request_count} size="small" color="warning" />
                            </TableCell>
                            <TableCell align="right">{part.total_quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Most Helped Teams
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Transactions</TableCell>
                          <TableCell align="right">Total Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.mostHelpedTeams.slice(0, 5).map((team) => (
                          <TableRow key={team.country_code}>
                            <TableCell>
                              <Chip label={team.country_code} size="small" color="success" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold">{team.transaction_count}</Typography>
                            </TableCell>
                            <TableCell align="right">{team.total_quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Least Helped Teams
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Transactions</TableCell>
                          <TableCell align="right">Total Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.leastHelpedTeams.slice(0, 5).map((team) => (
                          <TableRow key={team.country_code}>
                            <TableCell>
                              <Chip label={team.country_code} size="small" color="warning" />
                            </TableCell>
                            <TableCell align="right">{team.transaction_count}</TableCell>
                            <TableCell align="right">{team.total_quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    );
  };

  const renderUsersStats = (stats: ReportStats) => {
    const total = Number(stats.total || 0);
    const active = Number(stats.active_last_30_days || 0);
    const newUsers = Number(stats.new_last_7_days || 0);

    const activeRate = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h5" gutterBottom>
            User Analytics
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderStatCard('Total Users', total, 'All time', <PeopleIcon />, 'primary')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderStatCard('Active Users', active, `${activeRate}% activity rate`, <TrendingUpIcon />, 'success')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderStatCard('New This Week', newUsers, 'Last 7 days', <CheckCircleIcon />, 'info')}
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Activity
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Active (Last 30 Days)</Typography>
                    <Typography variant="body2" fontWeight="bold">{active} ({activeRate}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(activeRate)}
                    color="success"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Inactive</Typography>
                    <Typography variant="body2" fontWeight="bold">{total - active} ({total > 0 ? (((total - active) / total) * 100).toFixed(1) : 0}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={total > 0 ? ((total - active) / total) * 100 : 0}
                    color="warning"
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTeamsStats = (stats: ReportStats, data: Record<string, unknown>[]) => {
    const total = Number(stats.total || 0);
    const newTeams = Number(stats.new_last_7_days || 0);

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h5" gutterBottom>
            Team Analytics
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          {renderStatCard('Total Teams', total, 'Registered', <PeopleIcon />, 'primary')}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {renderStatCard('New This Week', newTeams, 'Last 7 days', <TrendingUpIcon />, 'success')}
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Teams by Activity
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Country</TableCell>
                      <TableCell align="right">Requests</TableCell>
                      <TableCell align="right">Spare Parts</TableCell>
                      <TableCell align="right">Total Activity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data
                      .sort((a, b) =>
                        (Number(b.total_requests) + Number(b.total_spare_parts)) -
                        (Number(a.total_requests) + Number(a.total_spare_parts))
                      )
                      .slice(0, 10)
                      .map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip label={String(row.country_code)} />
                          </TableCell>
                          <TableCell align="right">{String(row.total_requests || 0)}</TableCell>
                          <TableCell align="right">{String(row.total_spare_parts || 0)}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              {Number(row.total_requests || 0) + Number(row.total_spare_parts || 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAllReports = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Summary" />
          <Tab label="Requests" />
          <Tab label="Spare Parts" />
          <Tab label="Users" />
          <Tab label="Teams" />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {activeTab === 0 && reportData.summary && renderSummaryReport(reportData.summary.data)}
          {activeTab === 1 && reportData.requests && reportData.requests.stats &&
            renderRequestsStats(reportData.requests.stats, reportData.requests.analytics as RequestAnalytics)
          }
          {activeTab === 2 && reportData.spareParts && reportData.spareParts.stats &&
            renderSparePartsStats(reportData.spareParts.stats, reportData.spareParts.analytics as SparePartsAnalytics)
          }
          {activeTab === 3 && reportData.users && reportData.users.stats &&
            renderUsersStats(reportData.users.stats)
          }
          {activeTab === 4 && reportData.teams && reportData.teams.stats &&
            renderTeamsStats(reportData.teams.stats, reportData.teams.data)
          }
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <AssessmentIcon sx={{ fontSize: 40 }} color="primary" />
          <Typography variant="h4" component="h1">
            Admin Reports
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    label="Report Type"
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                  >
                    <MenuItem value="summary">Summary</MenuItem>
                    <MenuItem value="requests">Requests</MenuItem>
                    <MenuItem value="spare_parts">Spare Parts</MenuItem>
                    <MenuItem value="users">Users</MenuItem>
                    <MenuItem value="teams">Teams</MenuItem>
                    <MenuItem value="all">All Reports</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={fetchReport}
                  disabled={loading}
                >
                  Generate Report
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('csv')}
                disabled={!reportData || loading}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('json')}
                disabled={!reportData || loading}
              >
                Export JSON
              </Button>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : reportData ? (
          <Card>
            <CardContent>
              {reportType === 'summary' && reportData.data && renderSummaryReport(reportData.data)}
              {reportType === 'all' && renderAllReports()}
              {reportType === 'requests' && reportData.data && Array.isArray(reportData.data) && reportData.stats &&
                renderRequestsStats(reportData.stats, reportData.analytics as RequestAnalytics)
              }
              {reportType === 'spare_parts' && reportData.data && Array.isArray(reportData.data) && reportData.stats &&
                renderSparePartsStats(reportData.stats, reportData.analytics as SparePartsAnalytics)
              }
              {reportType === 'users' && reportData.data && Array.isArray(reportData.data) && reportData.stats &&
                renderUsersStats(reportData.stats)
              }
              {reportType === 'teams' && reportData.data && Array.isArray(reportData.data) && reportData.stats &&
                renderTeamsStats(reportData.stats, reportData.data)
              }
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Container>
  );
}

function AdminReportsWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['admin.dashboard']}>
        <AdminReports />
      </WithPermissions>
    </WithAuth>
  );
}

export default AdminReportsWithAuth;