'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { PermissionName } from '@/lib/auth-types';

interface WithPermissionsProps {
  children: ReactNode;
  requiredPermissions?: PermissionName[];
  requiredAnyPermissions?: PermissionName[];
}

/**
 * Higher-order component that protects content based on user permissions
 */
export function WithPermissions({ 
  children, 
  requiredPermissions = [],
  requiredAnyPermissions = [],
}: WithPermissionsProps) {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  // Show loading state while checking permissions
  if (isLoading) {
    return;
    // return (
    //   <Box sx={{ 
    //     display: 'flex', 
    //     flexDirection: 'column',
    //     justifyContent: 'center', 
    //     alignItems: 'center', 
    //     height: '50vh',
    //     gap: 2
    //   }}>
    //     <CircularProgress />
    //     <Typography>Checking permissions...</Typography>
    //   </Box>
    // );
  }

  // Check if user has all required permissions
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return;
  }

  // Check if user has any of the required permissions
  if (requiredAnyPermissions.length > 0 && !hasAnyPermission(requiredAnyPermissions)) {
    return;
  }

  return <>{children}</>;
}