'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import { countries } from '@/data/countries';
import CountryFlag from '@/components/common/CountryFlag';
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
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { kopInventory, getUnitsPerPackage, getDisplayName } from '@/data/kop-inventory';
import { ReviewStatus, SparePartStatus } from '@/lib/types';

interface FGCInventoryItem {
  id: string;
  group_name: string;
  part_number: string;
  description: string;
  quantity: number;
  review_status: ReviewStatus;
  image_url?: string;
}

// The real GET /api/spare-parts/[id] response shape (a single spare_parts
// row -- see SparePart.findById): one row is one issued item, not a batch.
interface SparePartData {
  id: string;
  country_code: string;
  country_name: string;
  item_name: string;
  fgc_part_number?: string;
  quantity: number;
  is_loan: boolean;
  status: SparePartStatus;
  submitted_by_name?: string;
  submitted_by_email?: string;
  notes?: string[];
}

function EditSparePartPage({ params }: { params: Promise<{ id: string }> }) {
  const { fetchWithAuth, session, isAuthenticated, isLoading: authLoading } = useAuthenticatedFetch();
  const router = useRouter();

  // Unwrap the async params using React.use()
  const { id } = React.use(params);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sparePartData, setSparePartData] = useState<SparePartData | null>(null);
  const [fgcInventory, setFgcInventory] = useState<FGCInventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [formData, setFormData] = useState({
    countryCode: '',
    fgcInventoryId: '',
    partNumber: '',
    description: '',
    quantity: 1,
    notes: '',
  });

  // Load FGC inventory items from static data, filtering out "do not loan" items
  useEffect(() => {
    try {
      // Filter out items that should not be loaned and sort by group name
      const loanableItems = kopInventory
        .filter(item => item.review_status !== 'do_not_loan')
        .sort((a, b) => a.group_name.localeCompare(b.group_name));
      setFgcInventory(loanableItems);
    } catch (error) {
      console.error('Error loading FGC inventory:', error);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  // Helper function to get review status chip
  const getReviewStatusChip = (status: ReviewStatus) => {
    switch (status) {
      case 'approval_needed':
        return (
          <Chip
            icon={<WarningIcon />}
            label="Approval Required"
            color="error"
            size="small"
            sx={{ ml: 1 }}
          />
        );
      case 'needs_hardware_review':
        return (
          <Chip
            icon={<BuildIcon />}
            label="Hardware Review"
            color="warning"
            size="small"
            sx={{ ml: 1 }}
          />
        );
      case 'needs_software_review':
        return (
          <Chip
            icon={<CodeIcon />}
            label="Software Review"
            color="info"
            size="small"
            sx={{ ml: 1 }}
          />
        );
      case 'normal':
        return null;
      default:
        return null;
    }
  };

  const fetchSparePart = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/spare-parts/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch spare part request');
      }

      const data: SparePartData = await response.json();
      setSparePartData(data);

      const inventoryItem = kopInventory.find(inv => inv.part_number === data.fgc_part_number);

      setFormData({
        countryCode: data.country_code,
        fgcInventoryId: inventoryItem?.id || '',
        partNumber: data.fgc_part_number || '',
        // Strip a redundant "- N Pack" suffix, but only when there's a
        // catalog match with a chip to compensate -- a catalog-less
        // free-text name has no chip, so stripping there would just
        // destroy real content.
        description: inventoryItem ? getDisplayName(data.item_name) : data.item_name,
        quantity: data.quantity,
        // notes is a TEXT[] in the DB, but there's only ever one free-text
        // box here (matching how the create form works) -- join for
        // display and collapse back into a single entry on save.
        notes: (data.notes || []).join('\n\n'),
      });
    } catch (error) {
      console.error('Error fetching spare part:', error);
      setError('Failed to load spare part request');
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchWithAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSparePart();
    }
  }, [isAuthenticated, fetchSparePart]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInventoryItemSelect = (selectedItem: FGCInventoryItem | null) => {
    setFormData(prev => ({
      ...prev,
      fgcInventoryId: selectedItem?.id || '',
      partNumber: selectedItem?.part_number || '',
      description: selectedItem ? getDisplayName(selectedItem.description) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.description.trim()) {
      setError('Please enter or select an item');
      setIsSubmitting(false);
      return;
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const trimmedNotes = formData.notes.trim();
      const updateData = {
        countryCode: formData.countryCode,
        fgcPartNumber: formData.partNumber || null,
        itemName: formData.description,
        quantity: formData.quantity,
        notes: trimmedNotes ? [trimmedNotes] : null,
      };

      const response = await fetchWithAuth(`/api/spare-parts/${id}`, {
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
      router.refresh();
    } catch (error) {
      console.error('Error updating spare part:', error);
      setError(error instanceof Error ? error.message : 'Failed to update request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
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

  const selectedInventoryItem = fgcInventory.find(inv => inv.id === formData.fgcInventoryId);

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          component={Link}
          href="/spare-parts"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Edit Spare Part Issue
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
              Quantity is always the number of individual pieces — for items marked{' '}
              <Chip label="pack of N" size="small" variant="outlined" component="span" sx={{ verticalAlign: 'middle' }} />, count out pieces, not packs.
            </Typography>
          </Alert>

          {loadingInventory && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading FGC Inventory...</Typography>
            </Box>
          )}

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
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CountryFlag code={option.code} />
                        {option.name} ({option.code})
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country/Team"
                      required
                      fullWidth
                      slotProps={{
                        ...params.slotProps,
                        input: {
                          ...params.slotProps.input,
                          startAdornment: formData.countryCode ? (
                            <CountryFlag code={formData.countryCode} sx={{ ml: 0.5 }} />
                          ) : undefined,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Item
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Autocomplete
                    freeSolo
                    options={fgcInventory}
                    getOptionLabel={(option) => typeof option === 'string' ? option : `${getDisplayName(option.description)} - ${option.part_number}`}
                    groupBy={(option) => option.group_name}
                    value={selectedInventoryItem || null}
                    inputValue={formData.description}
                    onInputChange={(_, newInputValue, reason) => {
                      // 'input' is the user actually typing; other reasons
                      // (selecting an option, clearing) are handled by
                      // onChange below via handleInventoryItemSelect.
                      if (reason !== 'input') return;
                      setFormData(prev => ({
                        ...prev,
                        description: newInputValue,
                        // Typing over the name drops any part number link,
                        // including a stale one not in the current catalog
                        // (fgcInventoryId already '' there, check partNumber).
                        ...(prev.partNumber ? { fgcInventoryId: '', partNumber: '' } : {}),
                      }));
                    }}
                    onChange={(_, newValue) => {
                      if (newValue === null || typeof newValue !== 'string') {
                        handleInventoryItemSelect(newValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Item Name"
                        placeholder="Type a name, or search the FGC catalog to autofill"
                        required
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      const unitsPerPackage = getUnitsPerPackage(option.part_number);
                      return (
                        <Box component="li" key={key} {...otherProps}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {getDisplayName(option.description)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Part #: {option.part_number}
                              </Typography>
                            </Box>
                            {unitsPerPackage > 1 && (
                              <Chip label={`pack of ${unitsPerPackage}`} size="small" variant="outlined" sx={{ mr: 1 }} />
                            )}
                            {getReviewStatusChip(option.review_status)}
                          </Box>
                        </Box>
                      );
                    }}
                    disabled={loadingInventory}
                    sx={{ flexGrow: 1 }}
                  />
                  {selectedInventoryItem && (
                    <>
                      {getUnitsPerPackage(formData.partNumber) > 1 && (
                        <Chip label={`pack of ${getUnitsPerPackage(formData.partNumber)}`} size="small" variant="outlined" sx={{ ml: 1 }} />
                      )}
                      {getReviewStatusChip(selectedInventoryItem.review_status)}
                    </>
                  )}
                  {!selectedInventoryItem && formData.partNumber && (
                    <Chip
                      label={`Not in current catalog (${formData.partNumber})`}
                      size="small"
                      variant="outlined"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Qty (individual items)"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                  required
                  slotProps={{ htmlInput: { min: 1 } }}
                />
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
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
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

export default function ProtectedEditSparePartPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['spare_parts.edit']}>
        <EditSparePartPage params={params} />
      </WithPermissions>
    </WithAuth>
  );
}
