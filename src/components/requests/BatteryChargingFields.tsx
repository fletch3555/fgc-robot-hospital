import React from 'react';
import {
  Grid,
  FormControl,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Alert,
} from '@mui/material';
import { BatteryChargingFullRounded } from '@mui/icons-material';
import { BatteryChargingRequestData } from '@/lib/types';

export interface BatteryChargingFieldsProps {
  data: BatteryChargingRequestData;
  onChange: (data: Partial<BatteryChargingRequestData>) => void;
  errors?: {[key: string]: string};
}

// Utility function to serialize form data for battery charging requests
export const serializeBatteryChargingData = (formData: FormData): BatteryChargingRequestData => ({
  batteryType: formData.get('batteryType')?.toString() as 'driver_hub' | 'robot_battery' | undefined,
  initialCharge: formData.get('initialCharge') ? Number(formData.get('initialCharge')?.toString()) : undefined,
});

export default function BatteryChargingFields({ data, onChange, errors = {} }: BatteryChargingFieldsProps) {
  const handleChange = (field: string, value: string | null) => {
    onChange({ [field]: value });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <FormControl fullWidth margin="normal" required>
          <Typography variant="subtitle1" gutterBottom>
            Battery Type *
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={data.batteryType || ""}
            onChange={(_, newValue) => {
              if (newValue !== null) {
                handleChange('batteryType', newValue);
              }
            }}
            aria-label="battery type"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
              width: '100%',
              '& .MuiToggleButton-root': {
                border: '1px solid',
                borderColor: errors.batteryType ? 'error.main' : 'divider',
                borderRadius: { xs: 1, sm: 2 },
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    borderColor: 'primary.dark',
                  },
                  '& .MuiTypography-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'primary.light',
                  borderColor: 'primary.main',
                },
                padding: { xs: 2, sm: 3 },
                minHeight: { xs: '80px', sm: '100px' },
                width: '100%',
                flex: 1,
                display: 'flex'
              },
            }}
          >
            <ToggleButton 
              value="driver_hub" 
              aria-label="Driver Hub"
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 1,
                width: '100%'
              }}>
                <BatteryChargingFullRounded />
                <Typography>Driver Hub</Typography>
              </Box>
            </ToggleButton>
            <ToggleButton 
              value="robot_battery" 
              aria-label="Robot Battery"
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 1,
                width: '100%'
              }}>
                <BatteryChargingFullRounded />
                <Typography>Robot Battery</Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
          {errors.batteryType && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errors.batteryType}
            </Alert>
          )}
        </FormControl>
      </Grid>
    </Grid>
  );
}