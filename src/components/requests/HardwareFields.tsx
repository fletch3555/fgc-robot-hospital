import React from 'react';
import {
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { HardwareRequestData } from '@/lib/types';

export interface HardwareFieldsProps {
  data: HardwareRequestData;
  onChange: (data: Partial<HardwareRequestData>) => void;
  errors?: {[key: string]: string};
}

// Utility function to serialize form data for hardware requests
export const serializeHardwareData = (formData: FormData): HardwareRequestData => ({
  type: formData.get('type')?.toString() as HardwareRequestData['type'] || undefined,
  location: formData.get('location')?.toString() as HardwareRequestData['location'] || undefined,
});

export default function HardwareFields({ data, onChange, errors = {} }: HardwareFieldsProps) {
  const handleTypeChange = (_: React.MouseEvent<HTMLElement>, newType: HardwareRequestData['type']) => {
    onChange({ type: newType || undefined });
  };

  const handleLocationChange = (_: React.MouseEvent<HTMLElement>, newLocation: HardwareRequestData['location']) => {
    onChange({ location: newLocation || undefined });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Hardware Request Type
        </Typography>
        <ToggleButtonGroup
          value={data.type}
          exclusive
          onChange={handleTypeChange}
          aria-label="hardware request type"
          fullWidth
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: { xs: 1, sm: 2 },
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: { xs: 1, sm: 2 },
              py: 1.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  borderColor: 'primary.dark',
                },
              },
              '&:hover': {
                backgroundColor: 'primary.light',
                borderColor: 'primary.main',
              },
            }
          }}
        >
          <ToggleButton value="mechanism_build" aria-label="mechanism build">
            Mechanism Build
          </ToggleButton>
          <ToggleButton value="troubleshooting" aria-label="troubleshooting">
            Troubleshooting
          </ToggleButton>
          <ToggleButton value="need_tools" aria-label="need tools">
            Need Tools
          </ToggleButton>
          <ToggleButton value="other" aria-label="other">
            Other
          </ToggleButton>
        </ToggleButtonGroup>
        {errors.type && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {errors.type}
          </Typography>
        )}
      </Grid>

      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Location
        </Typography>
        <ToggleButtonGroup
          value={data.location}
          exclusive
          onChange={handleLocationChange}
          aria-label="location"
          fullWidth
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: { xs: 1, sm: 2 },
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: { xs: 1, sm: 2 },
              py: 1.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  borderColor: 'primary.dark',
                },
              },
              '&:hover': {
                backgroundColor: 'primary.light',
                borderColor: 'primary.main',
              },
            }
          }}
        >
          <ToggleButton value="hospital" aria-label="hospital">
            Hospital
          </ToggleButton>
          <ToggleButton value="pit" aria-label="pit">
            Pit
          </ToggleButton>
        </ToggleButtonGroup>
        {errors.location && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {errors.location}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}