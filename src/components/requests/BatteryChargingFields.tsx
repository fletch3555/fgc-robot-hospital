import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Box,
  Alert,
} from '@mui/material';
import { BatteryChargingFullRounded } from '@mui/icons-material';
import { BatteryChargingRequestData, BatteryDeviceType, IBatteryUnit } from '@/lib/types';

const DEVICE_LABELS: Record<BatteryDeviceType, string> = {
  robot_controller: 'Robot Controller',
  driver_hub: 'Driver Hub',
};

export interface BatteryChargingFieldsProps {
  data: BatteryChargingRequestData;
  onChange: (data: Partial<BatteryChargingRequestData>) => void;
  errors?: {[key: string]: string};
  /** Every unit of the current device type, available or checked out. */
  batteryUnitOptions?: IBatteryUnit[];
  /** Called with the chosen unit instead of onChange, so the confirm-before-
   * overriding-a-stale-loan logic can live in the caller (which owns the
   * submission-time bookkeeping) rather than here. */
  onSelectNumber?: (unit: IBatteryUnit) => void;
  /** Whether this user may pick a unit that's still shown checked out to
   * someone else -- mirrors the battery_charging.return permission gating
   * the existing one-click Return button. */
  canOverrideLoan?: boolean;
}

// Utility function to serialize form data for battery charging requests
export const serializeBatteryChargingData = (formData: FormData): BatteryChargingRequestData => ({
  batteryType: formData.get('batteryType')?.toString() as BatteryDeviceType | undefined,
  loanerProvided: formData.get('loanerProvided') !== null,
});

export default function BatteryChargingFields({ data, onChange, errors = {}, batteryUnitOptions = [], onSelectNumber, canOverrideLoan = false }: BatteryChargingFieldsProps) {
  const handleChange = (field: string, value: string | null | undefined) => {
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
            onChange={(_, newValue) => handleChange('batteryType', newValue || undefined)}
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
              value="robot_controller"
              aria-label="Robot Controller"
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
                <Typography>Robot Controller</Typography>
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

      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={data.loanerProvided !== false}
              onChange={(e) => onChange({ loanerProvided: e.target.checked })}
            />
          }
          label="Provide a loaner battery"
        />
        {data.loanerProvided === false && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Team&apos;s battery will just charge here — no spare handed out.
          </Typography>
        )}
      </Grid>

      {data.loanerProvided !== false && data.batteryType && (
        <Grid size={12}>
          <FormControl fullWidth required error={!!errors.loanerBatteryNumber}>
            <InputLabel>Loaner Battery Number</InputLabel>
            <Select
              value={data.loanerBatteryNumber ?? ''}
              label="Loaner Battery Number"
              onChange={(e) => {
                const unit = batteryUnitOptions.find((u) => u.number === Number(e.target.value));
                if (unit) onSelectNumber?.(unit);
              }}
            >
              {batteryUnitOptions.length === 0 ? (
                <MenuItem value="" disabled>
                  No {DEVICE_LABELS[data.batteryType]} batteries in the pool
                </MenuItem>
              ) : (
                batteryUnitOptions.map((unit) => {
                  const checkedOut = unit.status !== 'available';
                  return (
                    <MenuItem
                      key={unit.number}
                      value={unit.number}
                      disabled={checkedOut && !canOverrideLoan}
                      sx={checkedOut ? { color: 'warning.dark', bgcolor: 'warning.light' } : undefined}
                    >
                      {DEVICE_LABELS[data.batteryType as BatteryDeviceType]} #{unit.number}
                      {checkedOut && ` — checked out to ${unit.country_name || unit.country_code}`}
                    </MenuItem>
                  );
                })
              )}
            </Select>
            {errors.loanerBatteryNumber && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.loanerBatteryNumber}
              </Typography>
            )}
          </FormControl>
        </Grid>
      )}
    </Grid>
  );
}