import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  FormLabel,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from '@mui/material';
import { MachineShopRequestData } from '@/lib/types';

export interface MachineShopFieldsProps {
  data: MachineShopRequestData;
  onChange: (data: Partial<MachineShopRequestData>) => void;
  errors?: {[key: string]: string};
}

// Utility function to serialize form data for machine shop requests
export const serializeMachineShopData = (formData: FormData): MachineShopRequestData => ({
  action: formData.get('action')?.toString() || undefined,
  actionOther: formData.get('actionOther')?.toString() || undefined,
  material: formData.get('material')?.toString() || undefined,
  materialOther: formData.get('materialOther')?.toString() || undefined,
  isTeamLabeled: formData.get('isTeamLabeled') === 'true',
  isDimensionallyMarked: formData.get('isDimensionallyMarked') === 'true',
  drawings: [], // This would need special handling for file uploads
});

export default function MachineShopFields({ data, onChange, errors = {} }: MachineShopFieldsProps) {
  const handleChange = (field: string, value: string | boolean | null) => {
    onChange({ [field]: value });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <FormControl 
          component="fieldset" 
          fullWidth 
          required 
          margin="normal"
          error={!!errors.action}
        >
          <FormLabel component="legend" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
            Action Needed
          </FormLabel>
          <ToggleButtonGroup
            value={data.action || ""}
            exclusive
            onChange={(event, newValue) => {
              if (newValue !== null) {
                handleChange('action', newValue);
              }
            }}
            aria-label="action needed"
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <ToggleButton value="cut" aria-label="cut">
              Cut
            </ToggleButton>
            <ToggleButton value="drill" aria-label="drill">
              Drill
            </ToggleButton>
            <ToggleButton value="tools" aria-label="tools needed">
              Tools Needed
            </ToggleButton>
            <ToggleButton value="other" aria-label="other action">
              Other
            </ToggleButton>
          </ToggleButtonGroup>
          {errors.action && (
            <FormHelperText>{errors.action}</FormHelperText>
          )}
        </FormControl>
      </Grid>

      {data.action === "other" && (
        <Grid size={12}>
          <TextField
            label="Specify Other Action"
            value={data.actionOther || ""}
            onChange={(e) => handleChange('actionOther', e.target.value)}
            fullWidth
            required
            margin="normal"
            error={!!errors.actionOther}
            helperText={errors.actionOther || "Maximum 100 characters"}
            inputProps={{ maxLength: 100 }}
          />
        </Grid>
      )}

      <Grid size={12}>
        <FormControl 
          component="fieldset" 
          fullWidth 
          required 
          margin="normal"
          error={!!errors.material}
        >
          <FormLabel component="legend" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
            Material Type
          </FormLabel>
          <ToggleButtonGroup
            value={data.material || ""}
            exclusive
            onChange={(event, newValue) => {
              if (newValue !== null) {
                handleChange('material', newValue);
              }
            }}
            aria-label="material type"
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <ToggleButton value="extrusion" aria-label="extrusion">
              Extrusion
            </ToggleButton>
            <ToggleButton value="shaft" aria-label="shaft">
              Shaft
            </ToggleButton>
            <ToggleButton value="corrogated_plastic" aria-label="corrogated plastic">
              Corrugated Plastic
            </ToggleButton>
            <ToggleButton value="other" aria-label="other material">
              Other
            </ToggleButton>
          </ToggleButtonGroup>
          {errors.material && (
            <FormHelperText>{errors.material}</FormHelperText>
          )}
          
          {data.material === "other" && (
            <TextField
              label="Specify Other Material"
              value={data.materialOther || ""}
              onChange={(e) => handleChange('materialOther', e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              placeholder="Please specify the other material type..."
              error={!!errors.materialOther}
              helperText={errors.materialOther || "Maximum 50 characters"}
              inputProps={{ maxLength: 50 }}
              required
            />
          )}
        </FormControl>
      </Grid>

      <Grid size={12}>
        <FormControl component="fieldset" fullWidth margin="normal">
          <Typography variant="subtitle2" gutterBottom>
            Material Preparation *
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={data.isTeamLabeled || false}
                  onChange={(e) => handleChange('isTeamLabeled', e.target.checked)}
                  color={errors.isTeamLabeled ? "error" : "primary"}
                />
              }
              label="Material is labeled with team name"
              sx={{ color: errors.isTeamLabeled ? 'error.main' : 'inherit' }}
            />
            {errors.isTeamLabeled && (
              <FormHelperText error sx={{ ml: 4 }}>
                {errors.isTeamLabeled}
              </FormHelperText>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={data.isDimensionallyMarked || false}
                  onChange={(e) => handleChange('isDimensionallyMarked', e.target.checked)}
                  color={errors.isDimensionallyMarked ? "error" : "primary"}
                />
              }
              label="Material is marked with dimensions"
              sx={{ color: errors.isDimensionallyMarked ? 'error.main' : 'inherit' }}
            />
            {errors.isDimensionallyMarked && (
              <FormHelperText error sx={{ ml: 4 }}>
                {errors.isDimensionallyMarked}
              </FormHelperText>
            )}
          </Box>
        </FormControl>
      </Grid>
    </Grid>
  );
}