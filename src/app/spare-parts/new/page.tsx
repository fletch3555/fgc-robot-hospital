'use client';

import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { kopInventory, getUnitsPerPackage } from '@/data/kop-inventory';
import { ReviewStatus } from '@/lib/types';

interface FGCInventoryItem {
  id: string;
  group_name: string;
  part_number: string;
  description: string;
  quantity: number;
  review_status: ReviewStatus;
  image_url?: string;
}

interface RequestedItem {
  fgcInventoryId: string;
  partNumber: string;
  description: string;
  requestedQuantity: number;
}

function NewSparePart() {
  const router = useRouter();
  const { fetchWithAuth } = useAuthenticatedFetch();

  // All hooks must be called at the top level
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fgcInventory, setFgcInventory] = useState<FGCInventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [formData, setFormData] = useState({
    countryCode: '',
    notes: '',
    requestedItems: [{
      fgcInventoryId: '',
      partNumber: '',
      description: '',
      requestedQuantity: 1,
    }] as RequestedItem[],
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

  const addRequestedItem = (afterIndex: number) => {
    setFormData(prev => {
      const newItems = [...prev.requestedItems];
      newItems.splice(afterIndex + 1, 0, {
        fgcInventoryId: '',
        partNumber: '',
        description: '',
        requestedQuantity: 1,
      });
      return {
        ...prev,
        requestedItems: newItems
      };
    });
  };

  const removeRequestedItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requestedItems: prev.requestedItems.filter((_, i) => i !== index)
    }));
  };

  const handleRequestedItemChange = (index: number, field: keyof RequestedItem, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      requestedItems: prev.requestedItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleInventoryItemSelect = (index: number, selectedItem: FGCInventoryItem | null) => {
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        requestedItems: prev.requestedItems.map((item, i) => 
          i === index ? { 
            ...item, 
            fgcInventoryId: selectedItem.id,
            partNumber: selectedItem.part_number,
            description: selectedItem.description,
          } : item
        )
      }));
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate that all items have been selected
    const hasUnselectedItems = formData.requestedItems.some(item => !item.fgcInventoryId);
    if (hasUnselectedItems) {
      setError('Please select an FGC inventory item for all items to issue');
      setIsSubmitting(false);
      return;
    }

    // Validate that all items have valid quantities
    const hasInvalidQuantities = formData.requestedItems.some(item => item.requestedQuantity <= 0);
    if (hasInvalidQuantities) {
      setError('All items must have a quantity greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: formData.countryCode,
          issuedItems: formData.requestedItems.map(item => ({
            fgcPartNumber: item.partNumber,
            itemName: item.description,
            quantity: item.requestedQuantity
          })),
          notes: formData.notes || '',
          isLoan: true // Default to loan since this is for tracking items given to teams
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to issue parts');
      }

      router.push('/spare-parts');
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Issue Spare Parts
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
                <strong>How it works:</strong> Select items from the FGC Kit of Parts inventory.
                Specify whether each item is for loan (must be returned) or consumable (to be kept).
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

                <Grid size={12}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Items to Issue
                  </Typography>
                </Grid>

                <Grid size={12}>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Qty (individual items)</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                        <TableBody>
                          {formData.requestedItems.map((item, index) => (
                            <TableRow key={`item-${index}`}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  <Autocomplete
                                    options={fgcInventory}
                                    getOptionLabel={(option) => `${option.description} - ${option.part_number}`}
                                    groupBy={(option) => option.group_name}
                                    value={fgcInventory.find(inv => inv.id === item.fgcInventoryId) || null}
                                    onChange={(_, newValue) => {
                                      handleInventoryItemSelect(index, newValue);
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        size="small"
                                        placeholder="Search FGC inventory..."
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
                                                {option.description}
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
                                    sx={{ flexGrow: 1, minWidth: 300 }}
                                  />
                                  {item.fgcInventoryId && fgcInventory.find(inv => inv.id === item.fgcInventoryId) && (
                                    <>
                                      {getUnitsPerPackage(item.partNumber) > 1 && (
                                        <Chip label={`pack of ${getUnitsPerPackage(item.partNumber)}`} size="small" variant="outlined" sx={{ ml: 1 }} />
                                      )}
                                      {getReviewStatusChip(fgcInventory.find(inv => inv.id === item.fgcInventoryId)!.review_status)}
                                    </>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.requestedQuantity}
                                  onChange={(e) => handleRequestedItemChange(index, 'requestedQuantity', parseInt(e.target.value) || 1)}
                                  required
                                  slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center' } } }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  <IconButton
                                    onClick={() => addRequestedItem(index)}
                                    size="small"
                                    color="primary"
                                  >
                                    <AddIcon />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => removeRequestedItem(index)}
                                    size="small"
                                    color="error"
                                    disabled={formData.requestedItems.length === 1}
                                  >
                                    <RemoveIcon />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
                      {isSubmitting ? 'Issuing Parts...' : 'Issue Parts'}
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

export default function ProtectedNewSparePart() {
  return (
    <WithAuth>
      <NewSparePart />
    </WithAuth>
  );
}