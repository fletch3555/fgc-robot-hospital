'use client';

import React, { useState, useMemo } from 'react';
import { WithAuth } from '@/components/auth/WithAuth';
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Pagination,
  Container,
} from '@mui/material';
import {
  Search as SearchIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { countries, searchTeams } from '@/data/countries';

function TeamsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    let teams = countries;

    // Apply search filter
    if (searchTerm.trim()) {
      teams = searchTeams(searchTerm.trim());
    }

    return teams;
  }, [searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredTeams.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeams, page]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  // Statistics
  const totalTeams = countries.length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Teams Management (Static)
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity="info" 
            icon={<InfoIcon />}
            sx={{ mb: 3 }}
          >
            This page displays static team data. To modify teams, edit the teams configuration in the source code at <code>src/data/teams.ts</code>.
          </Alert>

        {/* Statistics */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {totalTeams}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Teams
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Search and Filter Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3, 
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
            <TextField
              fullWidth
              placeholder="Search by country name or code..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>
          <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
            <Typography variant="body2" color="text.secondary">
              {filteredTeams.length} of {totalTeams} teams
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Teams Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Country Code</TableCell>
              <TableCell>Country Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {searchTerm ? 'No teams match your search criteria.' : 'No teams available.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTeams.map((team) => (
                <TableRow key={team.code} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {team.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{team.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Instructions */}
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Note:</strong> This teams page now uses static data instead of a database. 
            To add, remove, or modify teams, edit the configuration in <code>src/data/teams.ts</code> and redeploy your application.
          </Typography>
        </Alert>
        </Box>
      </Box>
    </Container>
  );
}

// Wrap the component with admin authentication protection
function TeamsPageWithAuth() {
  return (
    <WithAuth requiredRole="admin">
      <TeamsPage />
    </WithAuth>
  );
}

export default TeamsPageWithAuth;