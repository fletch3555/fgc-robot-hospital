'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Role, PermissionName } from '@/lib/auth-types';

interface PermissionsContextType {
  permissions: PermissionName[];
  roles: Role[];
  isLoading: boolean;
  hasPermission: (permission: PermissionName) => boolean;
  hasAnyPermission: (permissions: PermissionName[]) => boolean;
  hasAllPermissions: (permissions: PermissionName[]) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  refetchPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// Cache for permissions to avoid multiple API calls
let permissionsCache: {
  userId?: string;
  permissions: PermissionName[];
  roles: Role[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Helper functions for cache management
const getFromCache = (userId: string) => {
  if (!permissionsCache || permissionsCache.userId !== userId) {
    return null;
  }
  
  // Check if cache is expired
  if (Date.now() - permissionsCache.timestamp > CACHE_DURATION) {
    permissionsCache = null;
    return null;
  }
  
  return permissionsCache;
};

const setCache = (userId: string, data: { permissions: PermissionName[]; roles: Role[]; timestamp: number }) => {
  permissionsCache = {
    userId,
    ...data
  };
};

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<PermissionName[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = session?.user?.id;
  const sessionRoleNames = session?.user?.roles || [];

  const fetchPermissions = useCallback(async () => {
    if (!session?.user?.id) {
      setPermissions([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = getFromCache(session.user.id);
    if (cached) {
      setPermissions(cached.permissions);
      setRoles(cached.roles);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/permissions?userId=${session.user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
      setRoles(data.roles || []);

      // Cache the results
      setCache(session.user.id, {
        permissions: data.permissions || [],
        roles: data.roles || [],
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [userId, status, fetchPermissions]);

  // Clear cache when user changes
  useEffect(() => {
    if (permissionsCache && permissionsCache.userId !== userId) {
      permissionsCache = null;
    }
  }, [userId]);

  const hasPermission = (permission: PermissionName): boolean => {
    const allUserRoles = [...roles, ...sessionRoleNames];
    if (!allUserRoles.length) return false;
    // if (allUserRoles.includes('admin')) return true; // Admins have all permissions
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: PermissionName[]): boolean => {
    const allUserRoles = [...roles, ...sessionRoleNames];
    if (!allUserRoles.length) return false;
    // if (allUserRoles.includes('admin')) return true;
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: PermissionName[]): boolean => {
    const allUserRoles = [...roles, ...sessionRoleNames];
    if (!allUserRoles.length) return false;
    // if (allUserRoles.includes('admin')) return true;
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const canAccess = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}.${action}` as PermissionName);
  };

  const refetchPermissions = async (): Promise<void> => {
    // Clear cache to force fresh fetch
    permissionsCache = null;
    await fetchPermissions();
  };

  const contextValue: PermissionsContextType = {
    permissions,
    roles: roles,
    isLoading: isLoading || status === 'loading',
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    refetchPermissions
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}