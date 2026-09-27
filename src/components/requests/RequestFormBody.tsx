import {
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Box,
  Alert,
  Typography,
} from "@mui/material";
import { countries } from '@/data/countries';
import { RequestFormState, STATUS_OPTIONS } from '@/hooks/useRequestForm';
import CountryFlag from '@/components/common/CountryFlag';

interface RequestFormBodyProps {
  state: RequestFormState;
}

// The fields shared by every create/edit surface for a request — the
// modal (dialog chrome) and the standalone Hospital Intake page (page
// chrome) both render this around their own useRequestForm() instance.
export default function RequestFormBody({ state }: RequestFormBodyProps) {
  const {
    mode,
    fixedType,
    formData,
    error,
    validationErrors,
    users,
    outstandingBatteryRequests,
    handleChange,
    handleTypeChange,
    typeOptions,
    typeLocked,
    renderTypeSpecificFields,
  } = state;

  // A fixedType page/host has nothing to actually pick from, so the whole
  // selector is just noise — skip it rather than showing one disabled
  // button. Edit mode still shows it (disabled) for context.
  const showTypeSelector = !(mode === 'create' && fixedType);

  // Battery charging is a quick physical exchange, not a worked ticket --
  // there's no one to assign it to and nothing worth writing a comment
  // about, in either create or edit mode.
  const isBatteryCharging = formData.type === 'battery_charging';

  return (
    <Box component="form" onSubmit={state.handleSubmit} sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Country */}
      <Autocomplete
        disabled={mode === 'edit'}
        sx={{ mb: 3 }}
        value={countries.find(c => c.code === formData.country_code) || null}
        options={countries}
        getOptionLabel={(option) => option.name}
        onChange={mode === 'create' ? (_, newValue) => {
          handleChange({ target: { name: 'country_code', value: newValue?.code || "" } });
        } : undefined}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CountryFlag code={option.code} />
              {option.name}
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Country"
            error={!!validationErrors.country_code}
            helperText={mode === 'create' ? validationErrors.country_code : undefined}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: formData.country_code ? (
                  <CountryFlag code={formData.country_code} sx={{ ml: 0.5 }} />
                ) : undefined,
              },
            }}
          />
        )}
      />

      {/* Request Type — large touch-friendly buttons, not a dropdown, since this is
          primarily used on tablets at intake stations. Skipped entirely on a
          fixedType host, which has nothing to actually pick from. */}
      {showTypeSelector && (
      <FormControl fullWidth sx={{ mb: 3 }} error={!!validationErrors.type}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: validationErrors.type ? 'error.main' : 'inherit' }}
        >
          Request Type
        </Typography>
        <ToggleButtonGroup
          value={formData.type}
          exclusive
          onChange={mode === 'create' && !typeLocked ? (_, newValue) => {
            if (newValue) handleTypeChange(newValue);
          } : undefined}
          aria-label="request type"
          fullWidth
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${typeOptions.length}, 1fr)` },
            gap: { xs: 1, sm: 2 },
            width: '100%',
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
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
              flexDirection: 'column',
              padding: 2,
              minHeight: { xs: '72px', sm: '88px' },
              width: '100%',
            },
          }}
        >
          {typeOptions.map((option) => (
            <ToggleButton key={option.value} value={option.value} aria-label={option.label} disabled={typeLocked}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                {option.icon}
                <Typography variant="body2">{option.label}</Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {validationErrors.type && (
          <FormHelperText sx={{ mt: 1 }}>{validationErrors.type}</FormHelperText>
        )}
      </FormControl>
      )}

      {/* Status — only meaningful once a request exists */}
      {mode === 'edit' && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Status</InputLabel>
          <Select
            name="status"
            value={formData.status}
            onChange={handleChange}
            label="Status"
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Type-specific fields */}
      <Box sx={{ mb: 3 }}>
        {renderTypeSpecificFields()}
      </Box>

      {formData.type === 'battery_charging' && mode === 'create' && outstandingBatteryRequests.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {countries.find((c) => c.code === formData.country_code)?.name || formData.country_code} already has
          an outstanding battery charging request for this device — consider closing that one first.
        </Alert>
      )}

      {/* Assigned To — not applicable to battery charging (no one to work the ticket) */}
      {!isBatteryCharging && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Assigned To</InputLabel>
          <Select
            name="assigned_to"
            value={formData.assigned_to}
            onChange={handleChange}
            label="Assigned To"
          >
            <MenuItem value="">
              <em>Unassigned</em>
            </MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Comments — not applicable to battery charging */}
      {!isBatteryCharging && (
        <TextField
          name="comments"
          label="Comments"
          multiline
          rows={4}
          value={formData.comments}
          onChange={handleChange}
          fullWidth
          error={!!validationErrors.comments}
          helperText={validationErrors.comments}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          sx={{ mb: 3 }}
        />
      )}
    </Box>
  );
}
