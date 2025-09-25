import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { HardwareRequestData } from '@/lib/types';

export interface HardwareFieldsProps {
  data: HardwareRequestData;
  onChange: (data: Partial<HardwareRequestData>) => void;
  errors?: {[key: string]: string};
}

// Utility function to serialize form data for hardware requests
export const serializeHardwareData = (formData: FormData): HardwareRequestData => ({
  partName: formData.get('partName')?.toString() || undefined,
  partNumber: formData.get('partNumber')?.toString() || undefined,
  replacementRequired: formData.get('replacementRequired')?.toString() || undefined,
  issue: formData.get('issue')?.toString() || undefined,
  serialNumber: formData.get('serialNumber')?.toString() || undefined,
});

export default function HardwareFields({ data, onChange, errors = {} }: HardwareFieldsProps) {
  const handleChange = (field: string, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <TextField
          label="Part Name"
          value={data.partName || ""}
          onChange={(e) => handleChange('partName', e.target.value)}
          fullWidth
          required
          error={!!errors.partName}
          helperText={errors.partName}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: { xs: 1, sm: 2 }
            }
          }}
          margin="normal"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Part Number"
          value={data.partNumber || ""}
          onChange={(e) => handleChange('partNumber', e.target.value)}
          fullWidth
          margin="normal"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Serial Number"
          value={data.serialNumber || ""}
          onChange={(e) => handleChange('serialNumber', e.target.value)}
          fullWidth
          margin="normal"
        />
      </Grid>
      <Grid size={12}>
        <FormControl fullWidth margin="normal" error={!!errors.replacementRequired}>
          <InputLabel>Replacement Required *</InputLabel>
          <Select
            value={data.replacementRequired || "unknown"}
            onChange={(e) => handleChange('replacementRequired', e.target.value)}
            label="Replacement Required *"
          >
            <MenuItem value="unknown">Unknown</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </Select>
          {errors.replacementRequired && (
            <div style={{ color: '#d32f2f', fontSize: '0.75rem', margin: '3px 14px 0' }}>
              {errors.replacementRequired}
            </div>
          )}
        </FormControl>
      </Grid>
      <Grid size={12}>
        <TextField
          label="Issue Description"
          value={data.issue || ""}
          onChange={(e) => handleChange('issue', e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
          placeholder="Please describe the hardware issue..."
        />
      </Grid>
    </Grid>
  );
}