"use client";

import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { JSX, useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
} from "@mui/icons-material";
import { IRequest } from '@/lib/types';
import { getCountryName } from '@/lib/countryUtils';
import { formatRequestDate } from '@/lib/dateUtils';
import EditRequestModal from '@/components/requests/EditRequestModal';
import { PermissionName } from '@/lib/auth-types';
import { usePermissions } from '@/contexts/PermissionsContext';

function RequestsPage() {
  const { fetchWithAuth, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const [requests, setRequests] = useState<IRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IRequest | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetchWithAuth("/api/requests");
        if (!response.ok) {
          throw new Error("Failed to fetch requests");
        }
        const data = await response.json();
        setRequests(data);
      } catch (err) {
        setError("Failed to load requests");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchRequests();
      // Auto-refresh every 2 minutes
      const interval = setInterval(fetchRequests, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchWithAuth]);

  const handleEditRequest = (request: IRequest, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from triggering
    setSelectedRequest(request);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedRequest(null);
  };

  const handleRequestUpdated = (updatedRequest: IRequest) => {
    setRequests(prev => {
      // If request is completed, remove it from the list
      if (updatedRequest.status === 'completed') {
        return prev.filter(req => req.id !== updatedRequest.id);
      }
      // Otherwise, update the request in the list and re-sort
      const updated = prev.map(req => req.id === updatedRequest.id ? updatedRequest : req);
      // Sort to maintain in-progress before open
      return updated.sort((a, b) => {
        const statusOrder = { 'in-progress': 1, 'open': 2, 'completed': 3 };
        const aOrder = statusOrder[a.status] || 3;
        const bOrder = statusOrder[b.status] || 3;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        // If same status, sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Define tab configurations
  const tabs = [
    { label: 'All', value: 'all', icon: null, count: requests.length, permissions: ['hardware.view', 'software.view', 'machine_shop.view', 'battery_charging.view'] },
    { label: 'Hardware', value: 'hardware', icon: <BuildRounded />, count: requests.filter(r => r.type === 'hardware').length, permissions: ['hardware.view'] },
    { label: 'Software', value: 'software', icon: <ComputerRounded />, count: requests.filter(r => r.type === 'software').length, permissions: ['software.view'] },
    { label: 'Machine Shop', value: 'machine_shop', icon: <PrecisionManufacturingRounded />, count: requests.filter(r => r.type === 'machine_shop').length, permissions: ['machine_shop.view'] },
    { label: 'Battery Charging', value: 'battery_charging', icon: <BatteryChargingFullRounded />, count: requests.filter(r => r.type === 'battery_charging').length, permissions: ['battery_charging.view'] },
  ] as {
    label: string,
    value: string,
    icon: JSX.Element | null,
    count: number,
    permissions: PermissionName[]
  }[];

  // Filter tabs based on permissions
  const visibleTabs = tabs
    .filter(tab => tab.count > 0)
    .filter(tab => tab.permissions.some(permission => hasPermission(permission)));

  // Ensure selectedTab is within bounds of visible tabs
  const safeSelectedTab = Math.min(selectedTab, Math.max(0, visibleTabs.length - 1));

  // Filter requests based on selected tab
  const filteredRequests = safeSelectedTab === 0 || !visibleTabs[safeSelectedTab]
    ? requests
    : requests.filter(request => request.type === visibleTabs[safeSelectedTab].value);

  if (isLoading || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Support Requests
          </Typography>
          {/* <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/requests/new")}
          >
            New Request
          </Button> */}
        </Box>

        {/* Tabs for filtering by request type */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={safeSelectedTab} onChange={handleTabChange} aria-label="request type tabs">
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.value}
                icon={tab.icon || undefined}
                label={`${tab.label} (${tab.count})`}
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            ))}
          </Tabs>
        </Box>

        <Grid container spacing={3}>
          {filteredRequests.map((request) => (
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={request.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: 6,
                  },
                }}
                onClick={(e) => handleEditRequest(request, e)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {request.type.charAt(0).toUpperCase() + request.type.slice(1).replace(/[-_]/g, ' ')} Request
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {getCountryName(request.country_code)}
                  </Typography>
                  {request.assigned_to_name && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Assigned to: {request.assigned_to_name}
                    </Typography>
                  )}
                  {request.comments && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {request.comments.length > 100 
                        ? `${request.comments.substring(0, 100)}...` 
                        : request.comments}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: (theme) => {
                          switch (request.status) {
                            case "open":
                              return theme.palette.error.light;
                            case "in-progress":
                              return theme.palette.warning.light;
                            case "completed":
                              return theme.palette.success.light;
                            default:
                              return theme.palette.grey[300];
                          }
                        },
                        color: (theme) => {
                          switch (request.status) {
                            case "open":
                              return theme.palette.error.dark;
                            case "in-progress":
                              return theme.palette.warning.dark;
                            case "completed":
                              return theme.palette.success.dark;
                            default:
                              return theme.palette.grey[900];
                          }
                        },
                      }}
                    >
                      {request.status.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRequestDate(request.created_at)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filteredRequests.length === 0 && (
            <Grid size={12}>
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  {safeSelectedTab === 0 || !visibleTabs[safeSelectedTab]
                    ? "No support requests found"
                    : `No ${visibleTabs[safeSelectedTab].label.toLowerCase()} requests found`
                  }
                </Typography>
                {/* <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => router.push("/requests/new")}
                >
                  {safeSelectedTab === 0
                    ? "Create Your First Request"
                    : `Create ${visibleTabs[safeSelectedTab].label} Request`
                  }
                </Button> */}
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>

    <EditRequestModal
      open={editModalOpen}
      onClose={handleCloseEditModal}
      request={selectedRequest}
      onRequestUpdated={handleRequestUpdated}
    />
    </>
  )
};

// Wrap the component with authentication protection
function RequestsPageWithAuth() {
  return (
    <WithAuth>
      <RequestsPage />
    </WithAuth>
  );
}

export default RequestsPageWithAuth;