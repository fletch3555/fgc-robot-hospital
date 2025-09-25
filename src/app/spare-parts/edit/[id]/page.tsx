'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { countries } from '@/data/countries';
import {
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CardContent,
  Grid,
  Paper,
  Divider,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import Link from 'next/link';

interface SparePartData {
  _id: string;
  countryCode: string;
  itemName: string;
  quantity: number;
  isLoan: boolean;
  status: 'issued' | 'returned';
  submittedBy: {
    _id: string;
    name: string;
    email: string;
  };
  handledBy?: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

function EditSparePartPage({ params }: { params: { id: string } }) {
  const { fetchWithAuth, session, isAuthenticated, isLoading: authLoading } = useAuthenticatedFetch();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sparePartData, setSparePartData] = useState<SparePartData | null>(null);
  const [formData, setFormData] = useState({
    countryCode: '',
    itemName: '',
    quantity: 1,
    isLoan: false,
    notes: '',
  });

  const fetchSparePart = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/spare-parts/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch spare part request');
      }
      
      const data = await response.json();
      setSparePartData(data);
      
      // Populate form data
      setFormData({
        countryCode: data.countryCode,
        itemName: data.itemName,
        quantity: data.quantity,
        isLoan: data.isLoan,
        notes: data.notes ? data.notes.join('\n') : '',
      });
    } catch (error) {
      console.error('Error fetching spare part:', error);
      setError('Failed to load spare part request');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSparePart();
    }
  }, [isAuthenticated, fetchSparePart]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const selectedTeam = countries.find(t => t.code === formData.countryCode);

    if (!selectedTeam) {
      setError('Please select a valid country/team');
      setIsSubmitting(false);
      return;
    }

    if (!formData.itemName.trim()) {
      setError('Please provide an item name');
      setIsSubmitting(false);
      return;
    }

    try {
      const updateData = {
        countryCode: formData.countryCode,
        itemName: formData.itemName.trim(),
        quantity: formData.quantity,
        isLoan: formData.isLoan,
        notes: formData.notes.trim() ? [formData.notes.trim()] : [],
      };

      const response = await fetchWithAuth(`/api/spare-parts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update request');
      }

      // Redirect to spare parts list
      router.push('/spare-parts');
    } catch (error) {
      console.error('Error updating spare part:', error);
      setError(error instanceof Error ? error.message : 'Failed to update request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  if (error && !sparePartData) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          component={Link}
          href="/spare-parts"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Spare Parts
        </Button>
      </Box>
    );
  }

  if (!sparePartData) {
    return null;
  }

  // Check if user can edit this request
  const canEdit = sparePartData.submittedBy._id === session.user.id;

  if (!canEdit) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You can only edit your own requests.
        </Alert>
        <Button
          component={Link}
          href="/spare-parts"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Spare Parts
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          component={Link}
          href="/spare-parts"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back to Spare Parts
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Spare Part Request
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update your spare part request details below.
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2}>
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Current Status:</strong> {sparePartData.status.charAt(0).toUpperCase() + sparePartData.status.slice(1)}
              <br />
              <strong>Note:</strong> Only basic details can be edited.
            </Typography>
          </Alert>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  Request Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid size={12}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  value={countries.find(country => country.code === formData.countryCode) || null}
                  onChange={(_, newValue) => {
                    handleChange('countryCode', newValue?.code || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country/Team"
                      required
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label="Item Name"
                  value={formData.itemName}
                  onChange={(e) => handleChange('itemName', e.target.value)}
                  required
                  placeholder="e.g., Laptop Computer, Wire, Screws, etc."
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  select
                  fullWidth
                  label="Item Type"
                  value={formData.isLoan ? 'loan' : 'consumable'}
                  onChange={(e) => handleChange('isLoan', e.target.value === 'loan')}
                  SelectProps={{ native: true }}
                >
                  <option value="consumable">Consumable (will be used/consumed)</option>
                  <option value="loan">Loanable (must be returned)</option>
                </TextField>
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional information or special requirements..."
                />
              </Grid>

              <Grid size={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    component={Link}
                    href="/spare-parts"
                    variant="outlined"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Paper>
    </Box>
  );
}

export default async function ProtectedEditSparePartPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <WithAuth>
      <EditSparePartPage params={resolvedParams} />
    </WithAuth>
  );
}