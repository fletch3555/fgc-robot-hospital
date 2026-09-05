'use client';

import { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Container,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';

interface DashboardStats {
  totalUsers: number;
  totalRequests: number;
  totalSpareParts: number;
  totalTeams: number;
  pendingRequests: number;
  pendingSpareParts: number;
  activeUsers: number;
  teamsAtEvent: number;
}

function AdminDashboard() {
  const { fetchWithAuth, isAuthenticated } = useAuthenticatedFetch();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetchWithAuth('/api/admin/dashboard');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, fetchWithAuth]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'primary',
    subtitle 
  }: { 
    title: string; 
    value: number; 
    icon: React.ElementType; 
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    subtitle?: string;
  }) => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Icon color={color} sx={{ fontSize: 40, opacity: 0.7 }} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon={PeopleIcon}
              color="primary"
              subtitle={`${stats?.activeUsers || 0} active`}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Requests"
              value={stats?.totalRequests || 0}
              icon={AssignmentIcon}
              color="secondary"
              subtitle={`${stats?.pendingRequests || 0} pending`}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Spare Parts"
              value={stats?.totalSpareParts || 0}
              icon={BuildIcon}
              color="success"
              subtitle={`${stats?.pendingSpareParts || 0} pending`}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Teams"
              value={stats?.totalTeams || 0}
              icon={GroupsIcon}
              color="secondary"
              subtitle={`${stats?.teamsAtEvent || 0} at event`}
            />
          </Grid>

          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="Manage Users"
                    clickable
                    color="primary"
                    onClick={() => window.location.href = '/admin/users'}
                  />
                  <Chip
                    label="Manage Teams"
                    clickable
                    color="info"
                    onClick={() => window.location.href = '/admin/teams'}
                  />
                  <Chip
                    label="Manage Roles"
                    clickable
                    color="secondary"
                    onClick={() => window.location.href = '/admin/roles'}
                  />
                  <Chip
                    label="View Pending Requests"
                    clickable
                    color="warning"
                    onClick={() => window.location.href = '/requests'}
                  />
                  <Chip
                    label="Admin Requests"
                    clickable
                    color="error"
                    onClick={() => window.location.href = '/admin/requests'}
                  />
                  <Chip
                    label="Spare Parts Management"
                    clickable
                    color="success"
                    onClick={() => window.location.href = '/spare-parts'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

// Wrap the component with authentication and permission protection
function AdminDashboardWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['admin.dashboard']}>
        <AdminDashboard />
      </WithPermissions>
    </WithAuth>
  );
}

export default AdminDashboardWithAuth;