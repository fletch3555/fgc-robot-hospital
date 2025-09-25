'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { WithAuth } from './WithAuth';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import { Role } from '@/lib/auth-types';

interface WithPermissionsProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredAnyPermissions?: string[];
  requiredRole?: Role;
  fallbackMessage?: string;
}

/**
 * Higher-order component that protects content based on user permissions
 */
export function WithPermissions({ 
  children, 
  requiredPermissions = [],
  requiredAnyPermissions = [],
  requiredRole,
  fallbackMessage = "You don't have permission to access this content."
}: WithPermissionsProps) {
  const { hasAllPermissions, hasAnyPermission, roles, isLoading } = usePermissions();

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Checking permissions...</Typography>
      </Box>
    );
  }

  // Check specific role requirement
  if (requiredRole && !roles.includes(requiredRole) && !roles.includes('admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6">Access Restricted</Typography>
          <Typography>
            This content requires the role: <strong>{requiredRole}</strong>
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Check if user has all required permissions
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6">Insufficient Permissions</Typography>
          <Typography>{fallbackMessage}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Required permissions: {requiredPermissions.join(', ')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Check if user has any of the required permissions
  if (requiredAnyPermissions.length > 0 && !hasAnyPermission(requiredAnyPermissions)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6">Insufficient Permissions</Typography>
          <Typography>{fallbackMessage}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Required at least one of: {requiredAnyPermissions.join(', ')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

/**
 * Combined authentication and permission checking component
 */
interface WithAuthAndPermissionsProps extends WithPermissionsProps {
  requiredAuthRole?: 'admin' | 'volunteer';
  fallbackUrl?: string;
}

export function WithAuthAndPermissions({ 
  requiredAuthRole, 
  fallbackUrl,
  ...permissionProps 
}: WithAuthAndPermissionsProps) {
  return (
    <WithAuth requiredRole={requiredAuthRole} fallbackUrl={fallbackUrl}>
      <WithPermissions {...permissionProps} />
    </WithAuth>
  );
}