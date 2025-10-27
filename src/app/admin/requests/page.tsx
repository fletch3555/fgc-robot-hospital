"use client";

import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import { Edit as EditIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { IRequest } from '@/lib/types';
import { getCountryName } from '@/lib/countryUtils';
import { formatRequestDate } from '@/lib/dateUtils';
import EditRequestModal from '@/components/requests/EditRequestModal';

function AdminRequestsPage() {
  const router = useRouter();
  const { fetchWithAuth, isAuthenticated } = useAuthenticatedFetch();
  const [requests, setRequests] = useState<IRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all requests including completed ones for admin view
      const response = await fetchWithAuth("/api/admin/requests");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Access denied - Admin privileges required");
          return;
        }
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
  }, [fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
      // Auto-refresh every 2 minutes
      const interval = setInterval(fetchRequests, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchRequests]);

  const handleEditRequest = (request: IRequest) => {
    setSelectedRequest(request);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedRequest(null);
  };

  const handleRequestUpdated = (updatedRequest: IRequest) => {
    setRequests(prev => 
      prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "error";
      case "in-progress":
        return "warning";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  const formatRequestType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ');
  };

  if (status === "loading" || loading) {
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
      <Container maxWidth="xl">
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={fetchRequests}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="xl">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography variant="h4" component="h1">
              Admin - All Requests
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRequests}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => router.push("/requests/new")}
              >
                New Request
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="requests table">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {formatRequestType(request.type)}
                    </TableCell>
                    <TableCell>
                      {getCountryName(request.country_code)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.status.toUpperCase()}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {request.assigned_to_name || (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.submitted_by_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        {request.comments ? (
                          <Typography variant="body2" noWrap title={request.comments}>
                            {request.comments.length > 50 
                              ? `${request.comments.substring(0, 50)}...` 
                              : request.comments}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No comments
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatRequestDate(request.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Request">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditRequest(request)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requests.length === 0 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary">
                  No requests found
                </Typography>
              </Box>
            )}
          </TableContainer>
        </Box>
      </Container>

      <EditRequestModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        request={selectedRequest}
        onRequestUpdated={handleRequestUpdated}
      />
    </>
  );
}

// Wrap the component with authentication and permission protection
function AdminRequestsPageWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['admin.requests']}>
        <AdminRequestsPage />
      </WithPermissions>
    </WithAuth>
  );
}

export default AdminRequestsPageWithAuth;