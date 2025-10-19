'use client';

import { usePermissions } from '@/contexts/PermissionsContext';
import { getPermissionsByCategory } from '@/lib/authz';
import { PermissionName } from '@/lib/auth-types';
import { 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Box, 
  Grid,
  Skeleton,
  Alert
} from '@mui/material';
import { 
  CheckCircle as CheckIcon,
  Cancel as CancelIcon 
} from '@mui/icons-material';

interface PermissionsSummaryProps {
  showTitle?: boolean;
}

export function PermissionsSummary({ showTitle = true }: PermissionsSummaryProps) {
  const { permissions, roles, isLoading, hasPermission } = usePermissions();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Box sx={{ mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" height={32} sx={{ mt: 1 }} />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <Alert severity="warning">
        No roles assigned to user
      </Alert>
    );
  }

  // Use code-based permission categories
  const permissionCategories = getPermissionsByCategory();

  return (
    <Card>
      <CardContent>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            Permissions Summary
          </Typography>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Roles: {roles.map((role, index) => (
              <Chip 
                key={role}
                label={role} 
                size="small" 
                color="primary" 
                style={{ marginRight: index < roles.length - 1 ? 4 : 0 }}
              />
            ))}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {Object.entries(permissionCategories).map(([category, categoryPermissions]) => {
            const hasAnyInCategory = categoryPermissions.some(permission => hasPermission(permission.name as PermissionName));
            
            if (!hasAnyInCategory) return null;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {categoryPermissions.map(permission => {
                      const hasThisPermission = hasPermission(permission.name as PermissionName);
                      const action = permission.name.split('.')[1];
                      
                      return (
                        <Box 
                          key={permission.name}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            opacity: hasThisPermission ? 1 : 0.3
                          }}
                        >
                          {hasThisPermission ? (
                            <CheckIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="disabled" fontSize="small" />
                          )}
                          <Typography 
                            variant="body2" 
                            color={hasThisPermission ? 'text.primary' : 'text.disabled'}
                          >
                            {action}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {permissions.length === 0 && !roles.includes('admin') && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No permissions assigned to these roles
          </Alert>
        )}

        {roles.includes('admin') && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Administrators have access to all functionality
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}