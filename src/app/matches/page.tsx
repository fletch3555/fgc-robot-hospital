'use client';

import React, { useState, useEffect, SyntheticEvent } from 'react';
import Image from 'next/image';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
  TextField,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import moment from 'moment';
import { countries } from '@/data/countries';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';

interface Country {
  value: string;
  label: string;
  code: string;
  short: string;
}

interface MatchData {
  id: number;
  label: number;
  red1: Country;
  red2: Country;
  red3: Country;
  blue1: Country;
  blue2: Country;
  blue3: Country;
  scheduledTime: string;
  field: number;
}

interface ApiMatch {
  id: number;
  scheduledTime: string;
  field: number;
  played: boolean;
  participants: Array<{
    country: string;
  }>;
}

// Flag component for rendering country flags
const Flag: React.FC<{ country: Country; size?: number }> = ({ country, size = 24 }) => {
  const flagUrl = `https://flagcdn.com/w40/${country.short.toLowerCase()}.png`;
  
  return (
    <img
      src={flagUrl}
      alt={`${country.code} flag`}
      width={size}
      height={size * 0.75} // 4:3 aspect ratio
      style={{
        marginRight: 8,
        borderRadius: 2,
        backgroundColor: '#ffffff',
        objectFit: 'cover',
      }}
      onError={(e) => {
        // Fallback to a placeholder or hide if flag not found
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

const fetchCountry = (code: string): Country | undefined => {
  const countryInfo = countries.find((c) => c.code === code);
  if (countryInfo) {
    return {
      value: countryInfo.code.toLowerCase(),
      label: countryInfo.name,
      code: countryInfo.code,
      short: countryInfo.code.toLowerCase(),
    };
  }
  return undefined;
};

const MatchSchedulePage: React.FC = () => {
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch matches from FIRST Global API
  const fetchMatches = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      
      const response = await fetch('https://api.first.global/v1');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.matches) {
        // Filter out played matches and transform data
        const filtered = data.matches.filter((m: ApiMatch) => !m.played);
        const transformedMatches = filtered.map((match: ApiMatch) => {
          return {
            id: match.id,
            label: match.id,
            red1: fetchCountry(match.participants[0]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            red2: fetchCountry(match.participants[1]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            red3: fetchCountry(match.participants[2]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            blue1: fetchCountry(match.participants[3]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            blue2: fetchCountry(match.participants[4]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            blue3: fetchCountry(match.participants[5]?.country) || { code: 'UNK', name: 'Unknown', value: 'unk', label: 'Unknown', short: 'unk' },
            scheduledTime: moment(match.scheduledTime).format('H:mm ddd'),
            field: match.field,
          };
        });
        
        setMatchData(transformedMatches);
        setFilteredMatches(transformedMatches);
        setLastUpdated(new Date());
      } else {
        // Only clear data on initial load to prevent flash
        if (isInitialLoad) {
          setMatchData([]);
          setFilteredMatches([]);
        }
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      // setError(err instanceof Error ? err.message : 'Failed to fetch matches');
      // Only clear data on initial load to prevent flash
      if (isInitialLoad) {
        setMatchData([]);
        setFilteredMatches([]);
      }
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // Filter matches by country
  useEffect(() => {
    if (!selectedCountry) {
      setFilteredMatches(matchData);
    } else {
      const filtered = matchData.filter(match => 
        match.red1.code === selectedCountry.code ||
        match.red2.code === selectedCountry.code ||
        match.red3.code === selectedCountry.code ||
        match.blue1.code === selectedCountry.code ||
        match.blue2.code === selectedCountry.code ||
        match.blue3.code === selectedCountry.code
      );
      setFilteredMatches(filtered);
    }
  }, [selectedCountry, matchData]);

  // Fetch matches on component mount
  useEffect(() => {
    fetchMatches(true); // Initial load
  }, []);

  // Auto-refresh every 30 seconds (matching original)
  useEffect(() => {
    const interval = setInterval(() => fetchMatches(false), 30000); // Background refresh
    return () => clearInterval(interval);
  }, []);

  const handleCountryChange = (event: SyntheticEvent, newValue: { code: string; name: string } | null) => {
    setSelectedCountry(newValue);
  };

  const renderFlag = (params: { value?: Country }) => {
    const country = params.value;
    if (!country) return null;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Flag country={country} size={20} />
        <Typography variant="body2">
          {country.code}
        </Typography>
      </Box>
    );
  };

  // Field color mapping
  const getFieldColor = (fieldNumber: number): string => {
    const colorMap: { [key: number]: string } = {
      1: '#FFD700', // yellow
      2: '#4CAF50', // green
      3: '#00BCD4', // teal
      4: '#2196F3', // blue
      5: '#FF9800', // orange
    };
    return colorMap[fieldNumber] || '#757575'; // default gray
  };

  // Define DataGrid columns (matching original template)
  const columns: GridColDef[] = [
    {
      field: 'label',
      headerName: 'Match',
      flex: 0.5,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'scheduledTime',
      headerName: 'Time',
      flex: 0.7,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'field',
      headerName: 'Field',
      flex: 0.5,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: getFieldColor(params.value as number),
            color: '#000',
            fontWeight: 'bold',
            padding: '4px 12px',
            borderRadius: '4px',
            display: 'inline-block',
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'red1',
      headerName: '',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'red2',
      headerName: 'Red',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'red3',
      headerName: '',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'blue1',
      headerName: '',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'blue2',
      headerName: 'Blue',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      field: 'blue3',
      headerName: '',
      flex: 0.5,
      renderCell: renderFlag,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
  ];

  // Get unique countries from matches for filter dropdown
  const availableCountries = React.useMemo(() => {
    const countrySet = new Set<string>();
    matchData.forEach(match => {
      countrySet.add(match.red1.code);
      countrySet.add(match.red2.code);
      countrySet.add(match.red3.code);
      countrySet.add(match.blue1.code);
      countrySet.add(match.blue2.code);
      countrySet.add(match.blue3.code);
    });
    
    return Array.from(countrySet).sort().map(countryCode => {
      const country = countries.find(c => c.code === countryCode);
      return {
        code: countryCode,
        name: country?.name || countryCode,
      };
    });
  }, [matchData]);

  if (initialLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        FIRST Global 2025 - Match Schedule
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Live match schedule for unplayed qualification matches. Updates automatically every 30 seconds.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {refreshing && (
            <Chip
              size="small"
              label="Refreshing..."
              color="primary"
              variant="outlined"
              icon={<CircularProgress size={12} />}
            />
          )}
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {moment(lastUpdated).format('HH:mm:ss')}
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Autocomplete
          size="small"
          sx={{ minWidth: 200 }}
          options={availableCountries}
          getOptionLabel={(option) => `${option.name} (${option.code})`}
          value={selectedCountry}
          onChange={handleCountryChange}
          clearText="Clear filter"
          noOptionsText="No countries found"
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center' }}>
              {fetchCountry(option.code) && (
                <Flag country={fetchCountry(option.code)!} size={20} />
              )}
              {option.name} ({option.code})
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filter by Country"
              placeholder="Search countries..."
            />
          )}
        />
        
        <Typography variant="body2" color="text.secondary">
          Showing {filteredMatches.length} of {matchData.length} matches
        </Typography>
      </Box>

      <Box sx={{ height: 600, width: '100%', position: 'relative' }}>
        <DataGrid
          rows={filteredMatches}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          density="compact"
          sx={{
            '& .MuiDataGrid-cell': {
              borderRight: 1,
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'background.default',
              borderBottom: 2,
              borderColor: 'divider',
            },
            opacity: refreshing ? 0.7 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
        
        {/* Subtle loading overlay for background refreshes */}
        {refreshing && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, transparent, primary.main, transparent)',
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': {
                '0%': {
                  transform: 'translateX(-100%)',
                },
                '100%': {
                  transform: 'translateX(100%)',
                },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default function MatchSchedulePageWrapper() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['matches.view']}>
        <MatchSchedulePage />
      </WithPermissions>
    </WithAuth>
  );
}