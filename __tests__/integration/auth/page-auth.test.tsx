/**
 * Authentication Tests for Page Components
 * 
 * Tests authentication and authorization for all page components using
 * the WithAuth HOC and useAuthenticatedFetch hook
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import { PermissionsProvider } from '../../../src/contexts/PermissionsContext';

// Import page components - we'll test the internal components directly
import HomePage from '../../../src/app/page';
import RequestsPage from '../../../src/app/requests/page';
import NewRequestPage from '../../../src/app/requests/new/page';
import SparePartsPage from '../../../src/app/spare-parts/page';
import TeamsPage from '../../../src/app/teams/page';
import AdminDashboard from '../../../src/app/admin/page';
import AdminUsersPage from '../../../src/app/admin/users/page';
import AdminRolesPage from '../../../src/app/admin/roles/page';
import AdminRequestsPage from '../../../src/app/admin/requests/page';

// Mock Next.js modules
jest.mock('next-auth/react');
jest.mock('next/navigation');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt?: string; [key: string]: unknown }) => 
    <div data-testid="mock-image" data-src={props.src} data-alt={props.alt || ''} />,
}));

// Mock Material-UI components that might cause issues
jest.mock('@mui/x-data-grid', () => ({
  DataGrid: () => <div data-testid="data-grid">DataGrid</div>,
  GridColDef: {},
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

const mockVolunteerSession = {
  user: {
    id: 'volunteer-id',
    name: 'Volunteer User',
    email: 'volunteer@example.com',
    roles: ['volunteer', 'spare_parts_attendant'],
  },
  expires: '2025-12-31',
};

const mockAdminSession = {
  user: {
    id: 'admin-id',
    name: 'Admin User',
    email: 'admin@example.com',
    roles: ['admin'],
  },
  expires: '2025-12-31',
};

// Test wrapper that provides PermissionsProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PermissionsProvider>
    {children}
  </PermissionsProvider>
);

// Helper function to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper });
};

describe('Page Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    
    // Mock fetch for API calls
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/permissions')) {
        // Mock permissions API response - return different permissions based on userId
        const urlObj = new URL(url, 'http://localhost');
        const userId = urlObj.searchParams.get('userId');
        
        if (userId === 'admin-id') {
          // Admin user gets all admin permissions
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              permissions: [
                'requests.view',
                'requests.create',
                'requests.edit',
                'requests.delete',
                'admin.dashboard',
                'admin.users',
                'admin.roles',
                'admin.permissions',
                'admin.requests',
                'admin.system',
                'admin.reports',
                'spare_parts.view',
                'spare_parts.create',
                'spare_parts.edit',
                'spare_parts.issue',
                'spare_parts.receive',
                'inventory.view',
                'documentation.view'
              ],
              roles: ['admin']
            }),
            status: 200,
          });
        } else {
          // Volunteer user gets limited permissions
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              permissions: [
                'requests.view',
                'spare_parts.view',
                'spare_parts.create',
                'spare_parts.edit',
                'spare_parts.issue',
                'spare_parts.receive',
                'inventory.view',
                'documentation.view'
              ],
              roles: ['volunteer', 'spare_parts_attendant']
            }),
            status: 200,
          });
        }
      }
      
      // Default mock for other API calls
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        status: 200,
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unauthenticated Access', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
    });

    test('should not render main dashboard when unauthenticated', async () => {
      render(<HomePage />);
      
      await waitFor(() => {
        // WithAuth should not render children when unauthenticated
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Recent Requests')).not.toBeInTheDocument();
      });
    });

    test('should not render requests page when unauthenticated', async () => {
      render(<RequestsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Requests')).not.toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    test('should not render admin pages when unauthenticated', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Users')).not.toBeInTheDocument();
      });
    });

    test('should not render spare parts pages when unauthenticated', async () => {
      render(<SparePartsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Recent Spare Parts Requests')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });
    });

    test('should show loading state for all protected pages', async () => {
      const pages = [
        <HomePage key="home" />,
        <RequestsPage key="requests" />,
        <AdminDashboard key="admin" />,
        <SparePartsPage key="spare-parts" />,
      ];

      for (const page of pages) {
        const { unmount } = render(page);
        
        // Should show loading spinner
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        
        unmount();
      }
    });
  });

  describe('Volunteer Access', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockVolunteerSession,
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    test('should render main dashboard for authenticated volunteers', async () => {
      renderWithProviders(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Robot Hospital Dashboard')).toBeInTheDocument();
      });
    });

    test('should render requests page for authenticated volunteers', async () => {
      renderWithProviders(<RequestsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Support Requests')).toBeInTheDocument();
      });
    });

    test('should render new request page for authenticated volunteers', async () => {
      renderWithProviders(<NewRequestPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Support Request')).toBeInTheDocument();
      });
    });

    test('should NOT render spare parts pages for authenticated volunteers', async () => {
      renderWithProviders(<SparePartsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Recent Spare Parts Requests')).not.toBeInTheDocument();
      });
    });

    test('should NOT render teams pages for authenticated volunteers', async () => {
      renderWithProviders(<TeamsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Recent Teams Requests')).not.toBeInTheDocument();
      });
    });

    test('should NOT render admin pages for volunteers', async () => {
      renderWithProviders(<AdminDashboard />);
      
      await waitFor(() => {
        // WithAuth with requiredRole="admin" should not render for volunteers
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });

    test('should NOT render admin users page for volunteers', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      });
    });

    test('should NOT render admin roles page for volunteers', async () => {
      renderWithProviders(<AdminRolesPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Role Management')).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin Access', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockAdminSession,
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    test('should render main dashboard for admins', async () => {
      renderWithProviders(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Robot Hospital Dashboard')).toBeInTheDocument();
      });
    });

    test('should render all admin pages for authenticated admins', async () => {
      const adminPages = [
        { component: <AdminDashboard />, text: 'Admin Dashboard' },
        { component: <AdminRolesPage />, text: 'Roles & Permissions' },
        { component: <AdminRequestsPage />, text: 'Admin - All Requests' },
      ];

      for (const { component, text } of adminPages) {
        const { unmount } = renderWithProviders(component);
        
        await waitFor(() => {
          expect(screen.getByText(new RegExp(text, 'i'))).toBeInTheDocument();
        });
        
        unmount();
      }
    });

    test('should render volunteer pages for admins (admins have all access)', async () => {
      renderWithProviders(<RequestsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Support Requests')).toBeInTheDocument();
      });
    });
  });

  describe('Session Expiration Simulation', () => {
    test('should handle session expiration during page load', async () => {
      // Start with authenticated session
      mockUseSession.mockReturnValue({
        data: mockVolunteerSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      const { rerender } = render(<HomePage />);

      // Simulate session expiration
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      rerender(<HomePage />);

      await waitFor(() => {
        // Page should no longer render protected content
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Fetch Authentication', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockVolunteerSession,
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    test('should handle 401 responses in useAuthenticatedFetch', async () => {
      // Mock 401 response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        })
      ) as jest.Mock;

      render(<HomePage />);

      await waitFor(() => {
        // Should make API call
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should handle successful API responses', async () => {
      const mockData = [
        { 
          id: '1', 
          title: 'Test Request', 
          status: 'pending',
          type: 'hardware',
          description: 'Test description',
          teamId: 'team1',
          createdAt: new Date().toISOString()
        }
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        })
      ) as jest.Mock;

      renderWithProviders(<RequestsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/requests', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });
    });
  });

  describe('Role-Based UI Elements', () => {
    test('volunteer should not see admin navigation elements', async () => {
      mockUseSession.mockReturnValue({
        data: mockVolunteerSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        // Volunteers should not see admin-specific elements
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      });
    });

    test('admin should see admin-specific elements', async () => {
      mockUseSession.mockReturnValue({
        data: mockAdminSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });
});