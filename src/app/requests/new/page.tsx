"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { WithAuth } from '@/components/auth/WithAuth';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Autocomplete,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
} from "@mui/icons-material";

import { countries } from '@/data/countries';
import HardwareFields from '@/components/requests/HardwareFields';
import SoftwareFields from '@/components/requests/SoftwareFields';
import MachineShopFields from '@/components/requests/MachineShopFields';
import BatteryChargingFields from '@/components/requests/BatteryChargingFields';
import { HardwareRequestData, SoftwareRequestData, MachineShopRequestData, BatteryChargingRequestData } from '@/lib/types';

function CreateRequestPage() {
  const router = useRouter();
  const { fetchWithAuth, isLoading, session } = useAuthenticatedFetch();
  const { canAccess } = usePermissions();

  // All hooks must be called at the top level
  const [formData, setFormData] = useState({
    comments: "",
    type: "",
    country: "",
    status: "new",
    assignedTo: "",
  });

  // State for users list
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Separate state objects for each request type
  const [hardwareData, setHardwareData] = useState<HardwareRequestData>({
    type: undefined,
    location: undefined,
  });

  const [softwareData, setSoftwareData] = useState<SoftwareRequestData>({
    programmingLanguage: "",
    type: "",
  });

  const [machineShopData, setMachineShopData] = useState<MachineShopRequestData>({
    action: "",
    actionOther: "",
    material: "",
    materialOther: "",
    isTeamLabeled: false,
    isDimensionallyMarked: false,
  });

  const [batteryChargingData, setBatteryChargingData] = useState<BatteryChargingRequestData>({
    batteryType: undefined,
    initialCharge: undefined,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Fetch users based on request type who can be assigned to requests
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session || !formData.type) {
        setUsers([]);
        return;
      }
      
      setLoadingUsers(true);
      try {
        const response = await fetchWithAuth(`/api/users?permissions=${formData.type}.assignee`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session, fetchWithAuth, formData.type]);

  // Validation functions
  const validateHardwareData = () => {
    const errors: {[key: string]: string} = {};

    // Validate type is selected
    if (!hardwareData.type) {
      errors.type = "Please select a hardware request type";
    }

    // Validate location is selected
    if (!hardwareData.location) {
      errors.location = "Please select a location";
    }

    return errors;
  };  const validateSoftwareData = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate programming language is selected
    if (!softwareData.programmingLanguage) {
      errors.programmingLanguage = "Please select a programming language";
    }
    
    // Validate type is selected
    if (!softwareData.type) {
      errors.type = "Please select a software issue type";
    }
    
    return errors;
  };

  const validateMachineShopData = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate action is selected
    if (!machineShopData.action) {
      errors.action = "Please select an action needed";
    }
    
    // Validate "Other" action has description
    if (machineShopData.action === "other" && !machineShopData.actionOther?.trim()) {
      errors.actionOther = "Please specify the other action needed";
    }
    
    // Validate action other description length
    if (machineShopData.actionOther && machineShopData.actionOther.length > 100) {
      errors.actionOther = "Action description must be 100 characters or less";
    }
    
    // Validate material is selected
    if (!machineShopData.material) {
      errors.material = "Please select a material type";
    }
    
    // Validate "Other" material has description
    if (machineShopData.material === "other" && !machineShopData.materialOther?.trim()) {
      errors.materialOther = "Please specify the other material type";
    }
    
    // Validate material other description length
    if (machineShopData.materialOther && machineShopData.materialOther.length > 50) {
      errors.materialOther = "Material description must be 50 characters or less";
    }
    
    // Validate both material preparation checkboxes are required for safety
    if (!machineShopData.isTeamLabeled) {
      errors.isTeamLabeled = "Material must be labeled with team name for safety";
    }
    
    if (!machineShopData.isDimensionallyMarked) {
      errors.isDimensionallyMarked = "Material must be dimensionally marked for safety";
    }
    
    return errors;
  };

  const validateBatteryChargingData = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate battery type is selected
    if (!batteryChargingData.batteryType) {
      errors.batteryType = "Please select a battery type";
    }
    
    return errors;
  };

  const validateFormData = () => {
    const errors: {[key: string]: string} = {};
    
    // General validation
    if (!formData.country?.trim()) {
      errors.country = "Please select a country";
    }
    
    if (!formData.type) {
      errors.type = "Please select a request type";
    }
    
    // Comments are optional, but if provided, must be within character limit
    if (formData.comments && formData.comments.length > 500) {
      errors.comments = "Comments must be 500 characters or less";
    }
    
    // Type-specific validation
    if (formData.type === "hardware") {
      const hardwareErrors = validateHardwareData();
      Object.assign(errors, hardwareErrors);
    } else if (formData.type === "software") {
      const softwareErrors = validateSoftwareData();
      Object.assign(errors, softwareErrors);
    } else if (formData.type === "machine_shop") {
      const machineShopErrors = validateMachineShopData();
      Object.assign(errors, machineShopErrors);
    } else if (formData.type === "battery_charging") {
      const batteryChargingErrors = validateBatteryChargingData();
      Object.assign(errors, batteryChargingErrors);
    }
    
    return errors;
  };

  // Check if form is valid for submit button state
  const isFormValid = () => {
    const errors = validateFormData();
    return Object.keys(errors).length === 0;
  };

  // Show loading state while session is loading
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, don't render the form
  if (!session) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Specific handlers for each request type
  const handleHardwareChange = (data: Partial<HardwareRequestData>) => {
    setHardwareData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleSoftwareChange = (data: Partial<SoftwareRequestData>) => {
    setSoftwareData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleMachineShopChange = (data: Partial<MachineShopRequestData>) => {
    setMachineShopData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleBatteryChargingChange = (data: Partial<BatteryChargingRequestData>) => {
    setBatteryChargingData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: "hardware" | "software" | "machine_shop" | "battery_charging" | null
  ) => {
    if (newType) {
      setFormData((prev) => ({
        ...prev,
        type: newType,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});
    setLoading(true);

    try {
      // Validate form data
      const errors = validateFormData();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError("Please fix the validation errors before submitting");
        setLoading(false);
        return;
      }

      // Map form data to API expected format
      const requestData: {
        countryCode: string;
        type: string;
        comments?: string;
        assignedTo?: string;
        // priority?: string;
        hardwareData?: unknown;
        softwareData?: unknown;
        machineShopData?: unknown;
        batteryChargingData?: unknown;
      } = {
        countryCode: formData.country, // Map country field to countryCode
        type: formData.type,
        comments: formData.comments?.trim() || undefined, // Only include if not empty
        assignedTo: formData.assignedTo || undefined, // Include assigned user if selected
      };

      // Add type-specific data based on request type
      if (formData.type === 'hardware') {
        requestData.hardwareData = hardwareData;
      } else if (formData.type === 'software') {
        requestData.softwareData = softwareData;
      } else if (formData.type === 'machine_shop') {
        requestData.machineShopData = machineShopData;
      } else if (formData.type === 'battery_charging') {
        requestData.batteryChargingData = batteryChargingData;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Submitting request data:', requestData);
      }

      const response = await fetchWithAuth("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create request");
      }

      router.push("/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTypeSpecificFields = () => {
    switch (formData.type) {
      case "hardware":
        return (
          <HardwareFields
            data={hardwareData}
            onChange={handleHardwareChange}
            errors={validationErrors}
          />
        );

      case "software":
        return (
          <SoftwareFields
            data={softwareData}
            onChange={handleSoftwareChange}
            errors={validationErrors}
          />
        );

      case "machine_shop":
        return (
          <MachineShopFields
            data={machineShopData}
            onChange={handleMachineShopChange}
            errors={validationErrors}
          />
        );

      case "battery_charging":
        return (
          <BatteryChargingFields
            data={batteryChargingData}
            onChange={handleBatteryChargingChange}
            errors={validationErrors}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        py: { xs: 3, sm: 4, md: 5 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mx: 'auto',
        maxWidth: { xs: '100%', sm: '600px', md: '800px' }
      }}
    >
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2.125rem' },
          textAlign: 'center',
          mb: { xs: 2, sm: 3, md: 4 },
          fontWeight: 600,
          color: 'text.primary'
        }}
      >
        Create New Support Request
      </Typography>

      <Paper 
        elevation={3}
        sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          width: '100%',
          borderRadius: { xs: 1, sm: 2, md: 3 },
          transition: 'all 0.3s ease'
        }}
      >
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: { xs: 0, sm: 1 }
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <Autocomplete
              options={countries}
              getOptionLabel={(option) => `${option.name} (${option.code})`}
              value={countries.find(country => country.code === formData.country) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  country: newValue?.code || "",
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country/Team"
                  required
                  margin="normal"
                  error={!!validationErrors.country}
                  helperText={validationErrors.country || "Search by country name or code"}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: { xs: 1, sm: 2 }
                    }
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box 
                    component="li" 
                    key={key}
                    {...otherProps}
                    sx={{ 
                      py: 1.5,
                      px: 2
                    }}
                  >
                    <Typography>
                      {option.name} ({option.code})
                    </Typography>
                  </Box>
                );
              }}
              slotProps={{
                listbox: {
                  sx: {
                    maxHeight: '50vh'
                  }
                }
              }}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              filterOptions={(options, { inputValue }) => {
                const searchTerm = inputValue.toLowerCase();
                return options.filter(
                  option =>
                    option.name.toLowerCase().includes(searchTerm) ||
                    option.code.toLowerCase().includes(searchTerm)
                );
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth required error={!!validationErrors.type}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                sx={{ 
                  textAlign: 'center',
                  fontWeight: 500,
                  color: validationErrors.type ? 'error.main' : 'inherit'
                }}
              >
                Request Type
              </Typography>
              <ToggleButtonGroup
                value={formData.type}
                exclusive
                onChange={handleTypeChange}
                aria-label="request type"
                fullWidth
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
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
                      minHeight: { xs: '80px', sm: '100px' },
                      width: '100%'
                  },
                }}
              >
                {canAccess('hardware', 'create') && (
                  <ToggleButton value="hardware" aria-label="hardware">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <BuildRounded />
                      <Typography variant="body2">Hardware</Typography>
                    </Box>
                  </ToggleButton>
                )}
                {canAccess('software', 'create') && (
                  <ToggleButton value="software" aria-label="software">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <ComputerRounded />
                      <Typography variant="body2">Software</Typography>
                    </Box>
                  </ToggleButton>
                )}
                {canAccess('machine_shop', 'create') && (
                  <ToggleButton value="machine_shop" aria-label="machine shop">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <PrecisionManufacturingRounded />
                      <Typography variant="body2">Machine Shop</Typography>
                    </Box>
                  </ToggleButton>
                )}
                {canAccess('battery_charging', 'create') && (
                  <ToggleButton value="battery_charging" aria-label="battery charging">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <BatteryChargingFullRounded />
                      <Typography variant="body2">Battery Charging</Typography>
                    </Box>
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
              {validationErrors.type && (
                <FormHelperText sx={{ textAlign: 'center', mt: 1 }}>
                  {validationErrors.type}
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          {getTypeSpecificFields()}

          <Box sx={{ mb: 3 }}>
            <Autocomplete
              options={users}
              getOptionLabel={(option) => `${option.name}`}
              value={users.find(user => user.id === formData.assignedTo) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  assignedTo: newValue?.id || "",
                }));
              }}
              loading={loadingUsers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign To (Optional)"
                  margin="normal"
                  helperText="Select a person to assign this request to"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: { xs: 1, sm: 2 }
                    }
                  }}
                  slotProps={{
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                        <>
                          {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...otherProps}
                    sx={{
                      py: 1.5,
                      px: 2
                    }}
                  >
                    {/* <Box> */}
                      <Typography variant="body1">{option.name}</Typography>
                    {/* </Box> */}
                  </Box>
                );
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          </Box>

          <TextField
            name="comments"
            label="Additional Comments"
            value={formData.comments}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={4}
            error={!!validationErrors.comments}
            helperText={validationErrors.comments || `${formData.comments.length}/500 characters (optional)`}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />

          <Box 
            sx={{ 
              mt: { xs: 3, sm: 4, md: 5 },
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 3 },
              justifyContent: 'center'
            }}
          >
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !isFormValid()}
              fullWidth
              size="large"
              sx={{ 
                py: 1.5,
                borderRadius: { xs: 1, sm: 2 }
              }}
            >
              {loading ? "Creating..." : "Create Request"}
            </Button>
            {!isFormValid() && !loading && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  textAlign: 'center', 
                  fontStyle: 'italic',
                  mt: 1
                }}
              >
                Please complete all required fields to submit the request
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={() => router.push("/requests")}
              disabled={loading}
              fullWidth
              size="large"
              sx={{ 
                py: 1.5,
                borderRadius: { xs: 1, sm: 2 }
              }}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

// Wrap the component with authentication protection
function CreateRequestPageWithAuth() {
  return (
    <WithAuth>
      <CreateRequestPage />
    </WithAuth>
  );
}

export default CreateRequestPageWithAuth;