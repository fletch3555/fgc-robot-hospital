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
            '& .MuiToggleButton-root': {
              flex: 1,
              py: 1.5,
              borderRadius: 1,
              mx: 0.5,
              '&:first-of-type': { ml: 0 },
              '&:last-of-type': { mr: 0 }
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
            '& .MuiToggleButton-root': {
              flex: 1,
              py: 1.5,
              borderRadius: 1,
              mx: 0.5,
              '&:first-of-type': { ml: 0 },
              '&:last-of-type': { mr: 0 }
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