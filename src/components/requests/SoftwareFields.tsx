import React from 'react';
import {
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
} from '@mui/material';
import { SoftwareRequestData } from '@/lib/types';

export interface SoftwareFieldsProps {
  data: SoftwareRequestData;
  onChange: (data: Partial<SoftwareRequestData>) => void;
  errors?: { [key: string]: string };
}

// Utility function to serialize form data for software requests
export const serializeSoftwareData = (formData: FormData): SoftwareRequestData => ({
  programmingLanguage: formData.get('programmingLanguage')?.toString() || undefined,
  type: formData.get('type')?.toString() || undefined,
});

export default function SoftwareFields({ data, onChange, errors = {} }: SoftwareFieldsProps) {
  const handleChange = (field: string, value: string | null) => {
    onChange({ [field]: value || undefined });
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Programming Language *
        </Typography>
        <ToggleButtonGroup
          value={data.programmingLanguage || null}
          exclusive
          onChange={(_, value) => handleChange('programmingLanguage', value)}
          aria-label="programming language"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              border: errors.programmingLanguage ? '2px solid #f44336' : undefined,
            }
          }}
        >
          <ToggleButton value="on-bot-java" aria-label="on-bot java">
            On-bot Java
          </ToggleButton>
          <ToggleButton value="blocks" aria-label="blocks">
            Blocks
          </ToggleButton>
          <ToggleButton value="other" aria-label="other">
            Other
          </ToggleButton>
        </ToggleButtonGroup>
        {errors.programmingLanguage && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errors.programmingLanguage}
          </Alert>
        )}
      </Grid>
      
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Type *
        </Typography>
        <ToggleButtonGroup
          value={data.type || null}
          exclusive
          onChange={(_, value) => handleChange('type', value)}
          aria-label="type"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              border: errors.type ? '2px solid #f44336' : undefined,
            }
          }}
        >
          <ToggleButton value="new-functionality" aria-label="new functionality">
            New functionality
          </ToggleButton>
          <ToggleButton value="code-not-working" aria-label="code not working">
            Code not working
          </ToggleButton>
          <ToggleButton value="other" aria-label="other">
            Other
          </ToggleButton>
        </ToggleButtonGroup>
        {errors.type && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errors.type}
          </Alert>
        )}
      </Grid>
    </Grid>
  );
}