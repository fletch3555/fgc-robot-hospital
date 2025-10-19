'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Box,
  Card,
  Skeleton,
  Pagination,
  Stack
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import OptimizedImage from '@/components/OptimizedImage';
import { imageCacheManager } from '@/lib/imageCache';
import { ReviewStatus } from '@/lib/types';
import { kopInventory } from '@/data/kop-inventory';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';

// Function to get styling based on review status
const getReviewStatusStyling = (reviewStatus: ReviewStatus, mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  switch (reviewStatus) {
    case 'needs_software_review':
    case 'needs_hardware_review':
      return {
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#ffeb3b', // Yellow border
        backgroundColor: isDark ? '#4d4d00' : '#fffde7', // Dark yellow background for dark mode
      };
    case 'approval_needed':
      return {
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#f44336', // Red border
        backgroundColor: isDark ? '#4d0000' : '#ffebee', // Dark red background for dark mode
      };
    case 'do_not_loan':
      return {
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: isDark ? '#ffebee' : '#000000', // Black border
        backgroundColor: isDark ? '#4d0000' : '#ffebee', // Dark red background for dark mode
      };
    default:
      return {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        backgroundColor: 'background.paper',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)'
      };
  }
};

const FGCInventoryPage = () => {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter and paginate items based on search
  const { paginatedItems, pagination } = useMemo(() => {
    // Filter items based on search term
    const filtered = kopInventory.filter(item =>
      item.part_number.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.group_name.toLowerCase().includes(search.toLowerCase())
    );

    // Calculate pagination
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      paginatedItems: paginatedData,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        limit: itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    };
  }, [search, currentPage]);

  // Preload images for current page (non-blocking)
  useEffect(() => {
    if (paginatedItems.length > 0) {
      imageCacheManager.preloadImagesForPage(paginatedItems).catch(console.warn);
    }
  }, [paginatedItems]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Simulate loading for smooth UX
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [search, currentPage]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <InventoryIcon color="primary" />
        FGC 2025 Kit of Parts Inventory
      </Typography>

      {/* Search and Legend */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          {/* Search Box */}
          <Box sx={{ flex: '1 1 300px', minWidth: '280px' }}>
            <TextField
              fullWidth
              label="Search parts..."
              variant="outlined"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by part number or description"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          {/* Status Legend */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap', 
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'flex-end' }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                padding: '6px',
                borderRadius: '4px',
                ...getReviewStatusStyling('normal', mode)
              }}>
                <Typography variant="body2">Normal</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                padding: '6px',
                borderRadius: '4px',
                ...getReviewStatusStyling('needs_software_review', mode)
              }}>
                <Typography variant="body2">Needs Review</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                padding: '6px',
                borderRadius: '4px',
                ...getReviewStatusStyling('approval_needed', mode)
              }}>
                <Typography variant="body2">Approval Needed</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                padding: '6px',
                borderRadius: '4px',
                ...getReviewStatusStyling('do_not_loan', mode)
              }}>
                <Typography variant="body2">Do Not Loan</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Inventory Grid */}
      <Box sx={{ mb: 3 }}>
        {loading ? (
          // Loading skeleton
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: 2 
          }}>
            {Array.from(new Array(12)).map((_, index) => (
              <Card key={index} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Skeleton variant="rectangular" width={150} height={150} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="100%" height={24} />
                    <Skeleton variant="text" width="80%" height={24} />
                    <Skeleton variant="text" width="40%" height={24} />
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: 2 
          }}>
            {paginatedItems.map((item) => {
              return (
              <Card key={item.id} sx={{ 
                p: 2, 
                transition: 'all 0.2s ease-in-out',
                ...getReviewStatusStyling(item.review_status || 'normal', mode),
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {/* Image */}
                  <Box sx={{ flexShrink: 0 }}>
                    {item.image_url ? (
                      <OptimizedImage
                        src={item.image_url}
                        alt={item.description}
                        width={150}
                        height={150}
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 150,
                          height: 150,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                          backgroundColor: '#f5f5f5',
                          color: 'text.secondary'
                        }}
                      >
                        <Typography variant="body2">No Image</Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Information */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Description */}
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 1, 
                        fontWeight: 'bold',
                        color: 'text.primary',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.description}
                    </Typography>
                    
                    {/* Part Number */}
                    <Typography 
                      variant="body2" 
                      fontFamily="monospace" 
                      sx={{ 
                        mb: 2, 
                        color: 'primary.main',
                        fontWeight: 'medium',
                        wordBreak: 'break-all'
                      }}
                    >
                      {item.part_number}
                    </Typography>
                    
                    {/* Quantity */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1,
                      // backgroundColor: 'grey.50',
                      padding: 1,
                      borderRadius: 1
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Quantity in Kit:
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="secondary.main">
                        {item.quantity}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Pagination */}
      {!loading && (
        <Stack spacing={2} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalCount)} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} items
            </Typography>
          </Box>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Stack>
      )}
    </Container>
  );
};

function FGCInventoryPageWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['inventory.view']}>
        <FGCInventoryPage />
      </WithPermissions>
    </WithAuth>
  );
}

export default FGCInventoryPageWithAuth;