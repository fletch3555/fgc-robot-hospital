'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon 
} from '@mui/icons-material';

interface SparePart {
  id: string;
  country_code: string;
  country_name: string;
  item_name: string;
  fgc_part_number?: string;
  quantity: number;
  is_loan: boolean;
  status: 'issued' | 'returned';
  submitted_by: string;
  issued_by_name: string;
  issued_by_email: string;
  handled_by?: string;
  handled_by_name?: string;
  handled_by_email?: string;
  notes?: string[];
  created_at: string;
  updated_at: string;
  fgc_details?: {
    part_number: string;
    item_description: string;
    group_name: string;
  };
}

function SparePartsPage() {
  const { fetchWithAuth, session, isAuthenticated, isLoading } = useAuthenticatedFetch();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      const fetchSpareParts = () => {
        fetchWithAuth('/api/spare-parts')
          .then(res => {
            if (!res.ok) {
              throw new Error('Failed to fetch spare parts');
            }
            return res.json();
          })
          .then(data => {
            // Sort by created_at descending and take the 10 most recent
            const sortedData = data
              .sort((a: SparePart, b: SparePart) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .slice(0, 10);
            setSpareParts(sortedData);
          })
          .catch(err => {
            console.error(err);
            setError('Failed to load spare parts');
          })
          .finally(() => {
            setLoading(false);
          });
      };

      fetchSpareParts();
      // Auto-refresh every 2 minutes
      const interval = setInterval(fetchSpareParts, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchWithAuth]);

  const formatDate = (dateString: string) => {
    try {
      let date = new Date(dateString);
      
      // If the string doesn't include timezone info, treat it as UTC
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-')) {
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      // Format using local timezone - these methods automatically convert from UTC
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const time = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      return `${dayName} ${time}`;
    } catch {
      return 'Invalid Date';
    }
  };

  if (isLoading || loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box mt={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Recent Spare Parts Requests
          </Typography>
          <Button 
            component={Link} 
            href="/spare-parts/new" 
            variant="contained" 
            startIcon={<AddIcon />}
          >
            New Request
          </Button>
        </Box>

        {spareParts.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No spare parts found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Get started by issuing your first spare part to a team.
                </Typography>
                <Button
                  variant="contained"
                  component={Link}
                  href="/spare-parts/new"
                  startIcon={<AddIcon />}
                >
                  Issue Parts
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Showing {spareParts.length} most recent part(s) issued
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Issued</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spareParts.map((part) => (
                    <TableRow key={part.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {part.fgc_details?.item_description || part.item_name}
                          </Typography>
                          {part.fgc_details && (
                            <Typography variant="caption" color="text.secondary">
                              {part.fgc_details.part_number} • {part.fgc_details.group_name}
                            </Typography>
                          )}
                          {part.is_loan && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                              • LOAN ITEM
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {part.country_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {part.country_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          {part.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          color={part.status === 'issued' ? 'warning.main' : 'success.main'}
                          fontWeight="medium"
                        >
                          {part.status.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {formatDate(part.created_at)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {part.issued_by_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {/* Allow editing for parts issued by the current user */}
                        {part.issued_by_email === session?.user?.email && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<EditIcon />}
                            component={Link}
                            href={`/spare-parts/edit/${part.id}`}
                          >
                            Edit
                          </Button>
                        )}
                        {/* Show message for non-editable items */}
                        {part.issued_by_email !== session?.user?.email && (
                          <Typography variant="caption" color="text.secondary">
                            Not editable
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Container>
  );
}

export default function ProtectedSparePartsPage() {
  return (
    <WithAuth>
      <WithPermissions requiredAnyPermissions={['spare_parts.view', 'spare_parts.create', 'spare_parts.edit']}>
        <SparePartsPage />
      </WithPermissions>
    </WithAuth>
  );
}
