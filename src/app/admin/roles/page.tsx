'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Switch,
  Container,
} from '@mui/material';
import {
  Save as SaveIcon,
  Security as SecurityIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { Role, Permission } from '@/lib/auth-types';

interface RoleWithPermissions {
  role: Role;
  displayName: string;
  description: string;
  color: string;
  permissions: Permission[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function RoleManagementPage() {
  const { fetchWithAuth, isAuthenticated } = useAuthenticatedFetch();
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [, setPermissions] = useState<Permission[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  const [, setSelectedRole] = useState<Role | null>(null);
  const [, setRolePermissions] = useState<string[]>([]);
  const [matrixChanges, setMatrixChanges] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load roles and permissions
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetchWithAuth('/api/admin/roles'),
        fetchWithAuth('/api/admin/permissions')
      ]);

      if (!rolesResponse.ok || !permissionsResponse.ok) {
        throw new Error('Failed to load data');
      }

      const rolesData = await rolesResponse.json();
      const permissionsData = await permissionsResponse.json();

      setRoles(rolesData);
      setPermissions(permissionsData);

      // Group permissions by category
      const grouped = permissionsData.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
        if (!acc[permission.category]) {
          acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
      }, {});
      
      setPermissionsByCategory(grouped);

    } catch (error) {
      console.error('Error loading data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load role management data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      // Auto-refresh every 2 minutes
      const interval = setInterval(loadData, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadData]);

  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role);
    
    try {
      const response = await fetchWithAuth(`/api/admin/roles/${role}`);
      if (!response.ok) throw new Error('Failed to load role permissions');
      
      const rolePermissionsData = await response.json();
      setRolePermissions(rolePermissionsData.map((p: Permission) => p.id));
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load role permissions',
        severity: 'error'
      });
    }
  };

  const handleMatrixPermissionToggle = (role: Role, permissionId: string) => {
    setMatrixChanges(prev => {
      const rolePermissions = prev[role] || roles.find(r => r.role === role)?.permissions.map(p => p.id) || [];
      const newPermissions = rolePermissions.includes(permissionId)
        ? rolePermissions.filter(id => id !== permissionId)
        : [...rolePermissions, permissionId];
      
      return {
        ...prev,
        [role]: newPermissions
      };
    });
  };

  const handleSaveAllPermissions = async () => {
    try {
      setSaving(true);
      
      // Save changes for each modified role
      const savePromises = Object.entries(matrixChanges).map(([role, permissionIds]) =>
        fetchWithAuth(`/api/admin/roles/${role}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ permissionIds })
        })
      );

      const responses = await Promise.all(savePromises);
      const failedSaves = responses.filter(response => !response.ok);

      if (failedSaves.length > 0) {
        throw new Error('Some permission updates failed');
      }

      setSnackbar({
        open: true,
        message: 'All permission changes saved successfully',
        severity: 'success'
      });

      // Clear matrix changes and refresh data
      setMatrixChanges({});
      await loadData();
      
    } catch (error) {
      console.error('Error saving permissions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save some permission changes',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Roles & Permissions
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Roles & Permissions
        </Typography>

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab icon={<GroupIcon />} label="Role Overview" iconPosition="start" />
            <Tab icon={<SecurityIcon />} label="Permission Management" iconPosition="start" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Roles
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Overview of all roles and their permission counts
              </Typography>
              
              <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.role} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {role.displayName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {role.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              handleRoleSelect(role.role);
                              setTabValue(1);
                            }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Permission Matrix
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Complete overview of all role permissions. Click checkboxes to modify permissions.
                    </Typography>
                    {Object.keys(matrixChanges).length > 0 && (
                      <Chip 
                        label={`${Object.keys(matrixChanges).length} role(s) modified`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveAllPermissions}
                  disabled={saving || Object.keys(matrixChanges).length === 0}
                >
                  {saving ? 'Saving...' : `Save All Changes${Object.keys(matrixChanges).length > 0 ? ` (${Object.keys(matrixChanges).length})` : ''}`}
                </Button>
              </Box>

              {/* Permission Matrix Table */}
              <TableContainer component={Paper} sx={{ border: 1, borderColor: 'divider', maxHeight: 600, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 200, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                        Permission
                      </TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.role} align="center" sx={{ minWidth: 120 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', textAlign: 'center', lineHeight: 1 }}>
                              {role.displayName}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <React.Fragment key={category}>
                        {/* Category Header Row */}
                        <TableRow>
                          <TableCell 
                            colSpan={roles.length + 2}
                            sx={{ 
                              bgcolor: 'action.hover',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              fontSize: '0.8rem',
                              py: 1
                            }}
                          >
                            {category.replace('_', ' ')}
                          </TableCell>
                        </TableRow>
                        
                        {/* Permission Rows */}
                        {categoryPermissions.map((permission) => (
                          <TableRow key={permission.id} hover>
                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                              <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                                {permission.description}
                              </Typography>
                            </TableCell>
                            {roles.map((role) => {
                              const originalPermissions = role.permissions.map(p => p.id);
                              const currentPermissions = matrixChanges[role.role] || originalPermissions;
                              const hasPermission = currentPermissions.includes(permission.id);
                              const hasChanged = matrixChanges[role.role] && 
                                (originalPermissions.includes(permission.id) !== hasPermission);

                              return (
                                <TableCell key={role.role} align="center">
                                  <Switch
                                    checked={hasPermission}
                                    onChange={() => handleMatrixPermissionToggle(role.role, permission.id)}
                                    size="small"
                                    color={hasChanged ? "warning" : "primary"}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                    
                    {/* Summary Row */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'action.hover', zIndex: 1, fontWeight: 'bold' }}>
                        TOTAL PERMISSIONS
                      </TableCell>
                      {roles.map((role) => {
                        const originalCount = role.permissions.length;
                        const currentPermissions = matrixChanges[role.role] || role.permissions.map(p => p.id);
                        const currentCount = currentPermissions.length;
                        const hasChanged = matrixChanges[role.role] && originalCount !== currentCount;
                        
                        return (
                          <TableCell key={role.role} align="center" sx={{ bgcolor: 'action.hover' }}>
                            <Chip
                              label={currentCount}
                              size="small"
                              color={hasChanged ? "warning" : "primary"}
                              variant={hasChanged ? "filled" : "outlined"}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </TabPanel>
        </Card>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            severity={snackbar.severity as 'success' | 'error' | 'info'}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

// Wrap the component with admin authentication protection
function RoleManagementPageWithAuth() {
  return (
    <WithAuth requiredRole="admin">
      <RoleManagementPage />
    </WithAuth>
  );
}

export default RoleManagementPageWithAuth;