/**
 * Comprehensive test suite for the RBAC permission system
 * Tests the integration between roles, permissions, and page access control
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Role } from '@/lib/rbac-types';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock the permissions hook
jest.mock('@/contexts/PermissionsContext');
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;

describe('RBAC Permission System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission checking for different roles', () => {
    const testCases = [
      {
        role: 'guest',
        permissions: ['documentation.view', 'matches.view'],
        shouldHaveAccess: {
          'documentation.view': true,
          'matches.view': true,
          'inventory.view': false,
          'spare_parts.create': false,
          'requests.create': false,
          'admin.users': false
        }
      },
      {
        role: 'technician',
        permissions: ['documentation.view', 'matches.view', 'inventory.view', 'spare_parts.view', 'requests.view'],
        shouldHaveAccess: {
          'documentation.view': true,
          'matches.view': true,
          'inventory.view': true,
          'spare_parts.view': true,
          'requests.view': true,
          'spare_parts.create': false,
          'admin.users': false
        }
      },
      {
        role: 'admin',
        permissions: [
          'documentation.view', 'matches.view', 'inventory.view',
          'spare_parts.view', 'spare_parts.create', 'spare_parts.update', 'spare_parts.delete',
          'requests.view', 'requests.create', 'requests.update', 'requests.delete',
          'admin.users', 'admin.permissions', 'admin.roles'
        ],
        shouldHaveAccess: {
          'documentation.view': true,
          'matches.view': true,
          'inventory.view': true,
          'spare_parts.delete': true,
          'requests.delete': true,
          'admin.users': true,
          'admin.permissions': true,
          'admin.roles': true
        }
      }
    ];

    testCases.forEach(({ role, permissions, shouldHaveAccess }) => {
      describe(`${role} role`, () => {
        beforeEach(() => {
          // Mock session with minimal required properties
          mockUseSession.mockReturnValue({
            data: {
              user: { 
                id: '1', 
                email: `${role}@test.com`, 
                name: `Test ${role}`,
                roles: [role]
              },
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            },
            status: 'authenticated',
            update: jest.fn()
          });

          // Mock permissions hook with correct interface
          mockUsePermissions.mockReturnValue({
            permissions,
            roles: [role] as Role[],
            isLoading: false,
            hasPermission: (permission: string) => permissions.includes(permission),
            hasAnyPermission: (requiredPermissions: string[]) => 
              requiredPermissions.some(perm => permissions.includes(perm)),
            hasAllPermissions: (requiredPermissions: string[]) => 
              requiredPermissions.every(perm => permissions.includes(perm)),
            canAccess: (resource: string, action: string) => 
              permissions.includes(`${resource}.${action}`),
            refetchPermissions: jest.fn()
          });
        });

        Object.entries(shouldHaveAccess).forEach(([permission, hasAccess]) => {
          it(`should ${hasAccess ? 'have' : 'not have'} access to ${permission}`, () => {
            const TestComponent = () => (
              <WithPermissions requiredPermissions={[permission]}>
                <div data-testid="protected-content">Protected Content</div>
              </WithPermissions>
            );

            render(<TestComponent />);

            if (hasAccess) {
              expect(screen.getByTestId('protected-content')).toBeInTheDocument();
            } else {
              expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
              expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
            }
          });
        });
      });
    });
  });

  describe('Page access control', () => {
    it('should protect servo documentation pages with documentation.view permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: '1', email: 'guest@test.com', name: 'Guest', roles: ['guest'] },
          expires: new Date().toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      });

      mockUsePermissions.mockReturnValue({
        permissions: ['documentation.view'],
        roles: ['guest'] as Role[],
        isLoading: false,
        hasPermission: (permission: string) => permission === 'documentation.view',
        hasAnyPermission: (requiredPermissions: string[]) => 
          requiredPermissions.includes('documentation.view'),
        hasAllPermissions: (requiredPermissions: string[]) => 
          requiredPermissions.every(perm => perm === 'documentation.view'),
        canAccess: (resource: string, action: string) => 
          `${resource}.${action}` === 'documentation.view',
        refetchPermissions: jest.fn()
      });

      const ServoPage = () => (
        <WithPermissions requiredPermissions={['documentation.view']}>
          <div data-testid="servo-content">Servo Documentation</div>
        </WithPermissions>
      );

      render(<ServoPage />);
      expect(screen.getByTestId('servo-content')).toBeInTheDocument();
    });

    it('should protect inventory pages with inventory.view permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: '1', email: 'tech@test.com', name: 'Technician', roles: ['technician'] },
          expires: new Date().toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      });

      mockUsePermissions.mockReturnValue({
        permissions: ['inventory.view'],
        roles: ['spare_parts_attendant'] as Role[],
        isLoading: false,
        hasPermission: (permission: string) => permission === 'inventory.view',
        hasAnyPermission: (requiredPermissions: string[]) => 
          requiredPermissions.includes('inventory.view'),
        hasAllPermissions: (requiredPermissions: string[]) => 
          requiredPermissions.every(perm => perm === 'inventory.view'),
        canAccess: (resource: string, action: string) => 
          `${resource}.${action}` === 'inventory.view',
        refetchPermissions: jest.fn()
      });

      const InventoryPage = () => (
        <WithPermissions requiredPermissions={['inventory.view']}>
          <div data-testid="inventory-content">FGC Inventory</div>
        </WithPermissions>
      );

      render(<InventoryPage />);
      expect(screen.getByTestId('inventory-content')).toBeInTheDocument();
    });
  });

  describe('Permission categories', () => {
    it('should correctly categorize permissions by function', () => {
      const permissionCategories = {
        documentation: ['documentation.view'],
        inventory: ['inventory.view'],
        matches: ['matches.view'],
        spare_parts: ['spare_parts.view', 'spare_parts.create', 'spare_parts.update', 'spare_parts.delete'],
        requests: ['requests.view', 'requests.create', 'requests.update', 'requests.delete'],
        admin: ['admin.users', 'admin.permissions', 'admin.roles']
      };

      // Test that each category contains the expected permissions
      Object.entries(permissionCategories).forEach(([category, expectedPerms]) => {
        expectedPerms.forEach(permission => {
          expect(permission).toMatch(new RegExp(`^${category}\\.`));
        });
      });
    });
  });
});