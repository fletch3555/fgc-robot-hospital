'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { IUserAdmin } from '@/lib/types';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TablePagination,
  Alert,
  Tooltip,
  Container,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { RoleMetadata } from '@/lib/auth-types';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function UsersPage() {
  const { fetchWithAuth } = useAuthenticatedFetch();
  const [users, setUsers] = useState<IUserAdmin[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<IUserAdmin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: [] as string[],
    password: '',
  });

  // Helper function to format dates safely
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append('search', search);

      const response = await fetchWithAuth(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Error fetching users');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, fetchWithAuth]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/admin/roles');
      if (response.ok) {
        const rolesData = await response.json();
        setAvailableRoles(rolesData);
      } else {
        console.error('Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => fetchUsers(), 120000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchRoles]);

  const handleSearch = () => {
    fetchUsers(1, searchTerm);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    fetchUsers(newPage + 1, searchTerm);
  };

  const handleOpenDialog = (user?: IUserAdmin) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        roles: user.roles,
        password: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        roles: [],
        password: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const handleSaveUser = async () => {
    try {
      // Ensure at least one role is selected
      if (formData.roles.length === 0) {
        setError('Please select at least one role');
        return;
      }

      const url = editingUser ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const body = editingUser 
        ? { name: formData.name, email: formData.email, roles: formData.roles }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
        handleCloseDialog();
        fetchUsers(pagination.page, searchTerm);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save user');
      }
    } catch {
      setError('Error saving user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('User deleted successfully');
        fetchUsers(pagination.page, searchTerm);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch {
      setError('Error deleting user');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Management
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <IconButton onClick={handleSearch}>
            <SearchIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchUsers()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roles.map((roleName, index) => {
                      const roleMeta = availableRoles.find(r => r.role === roleName);
                      return (
                        <Chip
                          key={roleName}
                          label={roleMeta?.displayName || roleName}
                          color={roleName === 'admin' ? 'primary' : 'default'}
                          size="small"
                          style={{ marginRight: index < user.roles.length - 1 ? 4 : 0 }}
                        />
                      );
                    })}
                  </TableCell>
                  <TableCell>
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {formatDate(user.updatedAt)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit User">
                      <IconButton onClick={() => handleOpenDialog(user)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton 
                        onClick={() => handleDeleteUser(user._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={() => {}} // Disabled for now
          rowsPerPageOptions={[10]}
        />
      </TableContainer>

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={formData.roles}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setFormData({ ...formData, roles: value as string[] });
                }}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = availableRoles.find(r => r.role === value);
                      return (
                        <Chip 
                          key={value} 
                          label={role?.displayName || value} 
                          size="small"
                          color={value === 'admin' ? 'primary' : 'default'}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.role} value={role.role}>
                    {/* <Checkbox checked={formData.roles.indexOf(role.id) > -1} /> */}
                    <ListItemText 
                      primary={role.displayName}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!editingUser && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Container>
  );
}

// Wrap the component with authentication and permission protection
function UsersPageWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['admin.users']}>
        <UsersPage />
      </WithPermissions>
    </WithAuth>
  );
}

export default UsersPageWithAuth;