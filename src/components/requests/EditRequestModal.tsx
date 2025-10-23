"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
} from "@mui/icons-material";
import { IRequest, IUserSummary } from '@/lib/types';
import { countries } from '@/data/countries';
import HardwareFields from '@/components/requests/HardwareFields';
import SoftwareFields from '@/components/requests/SoftwareFields';
import MachineShopFields from '@/components/requests/MachineShopFields';
import BatteryChargingFields from '@/components/requests/BatteryChargingFields';
import { HardwareRequestData, SoftwareRequestData, MachineShopRequestData, BatteryChargingRequestData } from '@/lib/types';

interface EditRequestModalProps {
  open: boolean;
  onClose: () => void;
  request: IRequest | null;
  onRequestUpdated: (updatedRequest: IRequest) => void;
}

export default function EditRequestModal({ 
  open, 
  onClose, 
  request, 
  onRequestUpdated 
}: EditRequestModalProps) {
  const [formData, setFormData] = useState({
    comments: "",
    type: "",
    country_code: "",
    status: "open" as "open" | "in-progress" | "completed",
    assigned_to: "",
  });

  // Separate state objects for each request type
  const [hardwareData, setHardwareData] = useState<HardwareRequestData>({
    // partName: "",
    // partNumber: "",
    // replacementRequired: "",
    // issue: "",
    // serialNumber: "",
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
  const [users, setUsers] = useState<IUserSummary[]>([]);

  // Initialize form data when request changes
  useEffect(() => {
    if (request) {
      setFormData({
        comments: request.comments || "",
        type: request.type,
        country_code: request.country_code,
        status: request.status,
        assigned_to: request.assigned_to || "",
      });

      // Initialize separate data objects
      setHardwareData({
        type: (request.hardware_data as HardwareRequestData)?.type || undefined,
        location: (request.hardware_data as HardwareRequestData)?.location || undefined,
        // partName: (request.hardware_data as HardwareRequestData)?.partName || "",
        // partNumber: (request.hardware_data as HardwareRequestData)?.partNumber || "",
        // replacementRequired: (request.hardware_data as HardwareRequestData)?.replacementRequired || "",
        // issue: (request.hardware_data as HardwareRequestData)?.issue || "",
        // serialNumber: (request.hardware_data as HardwareRequestData)?.serialNumber || "",
      });

      setSoftwareData({
        programmingLanguage: (request.software_data as SoftwareRequestData)?.programmingLanguage || "",
        type: (request.software_data as SoftwareRequestData)?.type || "",
      });

      setMachineShopData({
        action: (request.machine_shop_data as MachineShopRequestData)?.action || "",
        actionOther: (request.machine_shop_data as MachineShopRequestData)?.actionOther || "",
        material: (request.machine_shop_data as MachineShopRequestData)?.material || "",
        materialOther: (request.machine_shop_data as MachineShopRequestData)?.materialOther || "",
        isTeamLabeled: (request.machine_shop_data as MachineShopRequestData)?.isTeamLabeled || false,
        isDimensionallyMarked: (request.machine_shop_data as MachineShopRequestData)?.isDimensionallyMarked || false,
      });

      setBatteryChargingData({
        batteryType: (request.battery_charging_data as BatteryChargingRequestData)?.batteryType || undefined,
        initialCharge: (request.battery_charging_data as BatteryChargingRequestData)?.initialCharge || undefined,
      });

      setError("");
    }
  }, [request]);

  // Fetch users based on request type
  useEffect(() => {
    const fetchUsers = async () => {
      if (!formData.type) return;
      
      try {
        const response = await fetch(`/api/users?permissions=${formData.type}.assignee`);
        if (response.ok) {
          const fetchedUsers = await response.json();
          setUsers(fetchedUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [formData.type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData(prev => ({
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

  // Validation functions
  const validateHardwareData = () => {
    const errors: {[key: string]: string} = {};

    // Validate type is selected
    if (!hardwareData.type) {
      errors.type = "Please select a request type";
    }
    // Validate location is selected
    if (!hardwareData.location) {
      errors.location = "Please select a work location";
    }
    
    return errors;
  };

  const validateSoftwareData = () => {
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
    if (machineShopData.materialOther && machineShopData.materialOther.length > 100) {
      errors.materialOther = "Material description must be 100 characters or less";
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
    if (!formData.country_code?.trim()) {
      errors.country_code = "Please select a country";
    }
    
    if (!formData.type) {
      errors.type = "Please select a request type";
    }
    
    // Comments are optional, but if provided, must be within character limit
    if (formData.comments && formData.comments.length > 500) {
      errors.comments = "Comments must be 500 characters or less";
    }
    
    // Assigned to validation (optional but if provided, must be valid)
    if (formData.assigned_to && !users.find(user => user.id === formData.assigned_to)) {
      errors.assigned_to = "Please select a valid user";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    // Validate form data
    const errors = validateFormData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError("Please fix the validation errors before saving");
      return;
    }

    setLoading(true);
    setError("");
    setValidationErrors({});

    try {
      // Map typeSpecificData to appropriate nested objects based on type
      const requestBody: {
        comments: string;
        status: string;
        country_code: string;
        assigned_to: string | null;
        hardware_data?: HardwareRequestData;
        software_data?: SoftwareRequestData;
        machine_shop_data?: MachineShopRequestData;
        battery_charging_data?: BatteryChargingRequestData;
      } = {
        comments: formData.comments,
        status: formData.status,
        country_code: formData.country_code,
        assigned_to: formData.assigned_to || null,
      };

      // Map type-specific data to the appropriate field
      switch (formData.type) {
        case "hardware":
          requestBody.hardware_data = hardwareData;
          break;
        case "software":
          requestBody.software_data = softwareData;
          break;
        case "machine_shop":
          requestBody.machine_shop_data = machineShopData;
          break;
        case "battery_charging":
          requestBody.battery_charging_data = batteryChargingData;
          break;
      }

      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update request');
      }

      const updatedRequest = await response.json();
      onRequestUpdated(updatedRequest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
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

  const typeOptions = [
    { value: "hardware", label: "Hardware", icon: <BuildRounded /> },
    { value: "software", label: "Software", icon: <ComputerRounded /> },
    { value: "machine_shop", label: "Machine Shop", icon: <PrecisionManufacturingRounded /> },
    { value: "battery_charging", label: "Battery Charging", icon: <BatteryChargingFullRounded /> },
  ];

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        Edit Request
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Request Type and Country - Side by side */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {/* Request Type - Read Only */}
            <FormControl sx={{ flex: 1 }} disabled>
              <InputLabel>Request Type</InputLabel>
              <Select value={formData.type} label="Request Type">
                {typeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Country - Read Only */}
            <Autocomplete
              disabled
              sx={{ flex: 1 }}
              value={countries.find(c => c.code === formData.country_code) || null}
              options={countries}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                />
              )}
            />
          </Box>

          {/* Status */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              label="Status"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Assigned To */}
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

          {/* Comments */}
          <TextField
            name="comments"
            label="Comments"
            multiline
            rows={4}
            value={formData.comments}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 3 }}
          />

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
        {!isFormValid() && !loading && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              textAlign: 'center', 
              fontStyle: 'italic'
            }}
          >
            Please complete all required fields to update the request
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading || !isFormValid()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Updating...' : 'Update Request'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}