import { useState, useEffect } from "react";
import {
  BuildRounded,
  ComputerRounded,
  PrecisionManufacturingRounded,
  BatteryChargingFullRounded,
} from "@mui/icons-material";
import {
  IRequest,
  IUserSummary,
  IBatteryUnit,
  RequestType,
  HardwareRequestData,
  SoftwareRequestData,
  MachineShopRequestData,
  BatteryChargingRequestData,
} from '@/lib/types';
import { usePermissions } from '@/contexts/PermissionsContext';
import HardwareFields from '@/components/requests/HardwareFields';
import SoftwareFields from '@/components/requests/SoftwareFields';
import MachineShopFields from '@/components/requests/MachineShopFields';
import BatteryChargingFields from '@/components/requests/BatteryChargingFields';

export const EMPTY_FORM_DATA = {
  comments: "",
  type: "",
  country_code: "",
  status: "open" as "open" | "in-progress" | "completed" | "cancelled",
  assigned_to: "",
};

const EMPTY_HARDWARE_DATA: HardwareRequestData = { type: undefined, location: undefined };
const EMPTY_SOFTWARE_DATA: SoftwareRequestData = { programmingLanguage: "", type: "" };
const EMPTY_MACHINE_SHOP_DATA: MachineShopRequestData = {
  action: "",
  actionOther: "",
  material: "",
  materialOther: "",
  isTeamLabeled: false,
  isDimensionallyMarked: false,
};
const EMPTY_BATTERY_CHARGING_DATA: BatteryChargingRequestData = { batteryType: undefined, loanerProvided: true };

export const ALL_TYPE_OPTIONS = [
  { value: "hardware", label: "Hardware", icon: <BuildRounded /> },
  { value: "software", label: "Software", icon: <ComputerRounded /> },
  { value: "machine_shop", label: "Machine Shop", icon: <PrecisionManufacturingRounded /> },
  { value: "battery_charging", label: "Battery Charging", icon: <BatteryChargingFullRounded /> },
];

export const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface UseRequestFormOptions {
  mode: 'create' | 'edit';
  /** null in create mode; the record being edited in edit mode. */
  request: IRequest | null;
  /** Create-mode only: preset the type and hide the other 3 options. */
  fixedType?: RequestType;
  /** Gates the (re)initialize effect, mirroring a modal's `open` prop —
   * pass `true` unconditionally for an always-mounted host like a page. */
  active: boolean;
  onRequestCreated?: (newRequest: IRequest) => void;
  onRequestUpdated?: (updatedRequest: IRequest) => void;
  /** Chrome-level hook: called after either a create or update succeeds,
   * so the caller can close a dialog, reset a page, show a toast, etc. */
  onSuccess?: () => void;
}

// Shared create/edit request form logic — used by both RequestFormModal
// (Dialog chrome, create or edit) and the standalone Hospital Intake page
// (Container chrome, create-only). Keeping this in one place avoids the
// two surfaces' validation/submit logic drifting apart (see the
// hardwareData/hardware_data casing bug this fixed previously).
export function useRequestForm({
  mode,
  request,
  fixedType,
  active,
  onRequestCreated,
  onRequestUpdated,
  onSuccess,
}: UseRequestFormOptions) {
  const { canAccess } = usePermissions();

  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [hardwareData, setHardwareData] = useState<HardwareRequestData>(EMPTY_HARDWARE_DATA);
  const [softwareData, setSoftwareData] = useState<SoftwareRequestData>(EMPTY_SOFTWARE_DATA);
  const [machineShopData, setMachineShopData] = useState<MachineShopRequestData>(EMPTY_MACHINE_SHOP_DATA);
  const [batteryChargingData, setBatteryChargingData] = useState<BatteryChargingRequestData>(EMPTY_BATTERY_CHARGING_DATA);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [users, setUsers] = useState<IUserSummary[]>([]);
  const [outstandingBatteryRequests, setOutstandingBatteryRequests] = useState<IRequest[]>([]);
  const [availableBatteryNumbers, setAvailableBatteryNumbers] = useState<number[]>([]);

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM_DATA, type: fixedType || "" });
    setHardwareData(EMPTY_HARDWARE_DATA);
    setSoftwareData(EMPTY_SOFTWARE_DATA);
    setMachineShopData(EMPTY_MACHINE_SHOP_DATA);
    setBatteryChargingData(EMPTY_BATTERY_CHARGING_DATA);
    setError("");
    setValidationErrors({});
  };

  // (Re)initialize form data whenever the host becomes active, either from
  // the request being edited or back to blank defaults for a new one.
  useEffect(() => {
    if (!active) return;

    if (request) {
      setFormData({
        comments: request.comments || "",
        type: request.type,
        country_code: request.country_code,
        status: request.status,
        assigned_to: request.assigned_to || "",
      });

      setHardwareData({
        type: (request.hardware_data as HardwareRequestData)?.type || undefined,
        location: (request.hardware_data as HardwareRequestData)?.location || undefined,
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
        loanerProvided: (request.battery_charging_data as BatteryChargingRequestData)?.loanerProvided !== false,
      });

      setError("");
      setValidationErrors({});
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, active, fixedType]);

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

  // Soft-warning check (create mode only): does this team already have an
  // outstanding battery_charging request for this device type? Reuses the
  // already-fetched, already-permission-filtered /api/requests list and
  // filters client-side, rather than adding new query params to that route.
  useEffect(() => {
    if (
      mode !== 'create' ||
      formData.type !== 'battery_charging' ||
      !formData.country_code ||
      !batteryChargingData.batteryType
    ) {
      setOutstandingBatteryRequests([]);
      return;
    }

    let cancelled = false;
    const checkOutstanding = async () => {
      try {
        const response = await fetch('/api/requests');
        if (response.ok && !cancelled) {
          const data = await response.json();
          const outstanding = ((data.active || []) as IRequest[]).filter((r) =>
            r.type === 'battery_charging' &&
            r.country_code === formData.country_code &&
            (r.battery_charging_data as BatteryChargingRequestData)?.batteryType === batteryChargingData.batteryType
          );
          setOutstandingBatteryRequests(outstanding);
        }
      } catch (error) {
        console.error('Error checking for outstanding battery charging requests:', error);
      }
    };

    checkOutstanding();
    return () => {
      cancelled = true;
    };
  }, [mode, formData.type, formData.country_code, batteryChargingData.batteryType]);

  // Which specific numbered units are free to hand out right now, for the
  // clerk to pick from at intake (create mode, loaner being provided, and a
  // device type already chosen).
  useEffect(() => {
    if (
      mode !== 'create' ||
      formData.type !== 'battery_charging' ||
      batteryChargingData.loanerProvided === false ||
      !batteryChargingData.batteryType
    ) {
      setAvailableBatteryNumbers([]);
      return;
    }

    let cancelled = false;
    const fetchAvailable = async () => {
      try {
        const response = await fetch('/api/requests/battery-units');
        if (response.ok && !cancelled) {
          const units: IBatteryUnit[] = await response.json();
          setAvailableBatteryNumbers(
            units
              .filter((u) => u.device_type === batteryChargingData.batteryType && u.status === 'available')
              .map((u) => u.number)
          );
        }
      } catch (error) {
        console.error('Error fetching available battery units:', error);
      }
    };

    fetchAvailable();
    return () => {
      cancelled = true;
    };
  }, [mode, formData.type, batteryChargingData.loanerProvided, batteryChargingData.batteryType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Switching type mid-create should clear any type-specific fields already
  // filled in for the previous type, so stale values can't linger unseen
  // and reappear if the user switches back.
  const handleTypeChange = (newType: string) => {
    handleChange({ target: { name: 'type', value: newType } });
    setHardwareData(EMPTY_HARDWARE_DATA);
    setSoftwareData(EMPTY_SOFTWARE_DATA);
    setMachineShopData(EMPTY_MACHINE_SHOP_DATA);
    setBatteryChargingData(EMPTY_BATTERY_CHARGING_DATA);
  };

  const handleHardwareChange = (data: Partial<HardwareRequestData>) => {
    setHardwareData((prev) => ({ ...prev, ...data }));
  };

  const handleSoftwareChange = (data: Partial<SoftwareRequestData>) => {
    setSoftwareData((prev) => ({ ...prev, ...data }));
  };

  const handleMachineShopChange = (data: Partial<MachineShopRequestData>) => {
    setMachineShopData((prev) => ({ ...prev, ...data }));
  };

  const handleBatteryChargingChange = (data: Partial<BatteryChargingRequestData>) => {
    setBatteryChargingData((prev) => {
      const next = { ...prev, ...data };
      // Switching device type or turning the loaner off invalidates
      // whichever specific unit was previously picked.
      const deviceTypeChanged = 'batteryType' in data && data.batteryType !== prev.batteryType;
      if (deviceTypeChanged || data.loanerProvided === false) {
        next.loanerBatteryNumber = undefined;
      }
      return next;
    });
  };

  const validateHardwareData = () => {
    const errors: { [key: string]: string } = {};
    if (!hardwareData.type) errors.type = "Please select a request type";
    if (!hardwareData.location) errors.location = "Please select a work location";
    return errors;
  };

  const validateSoftwareData = () => {
    const errors: { [key: string]: string } = {};
    if (!softwareData.programmingLanguage) errors.programmingLanguage = "Please select a programming language";
    if (!softwareData.type) errors.type = "Please select a software issue type";
    return errors;
  };

  // Mode-aware: the create flow has always required the two safety
  // checkboxes and capped materialOther at 50 chars; the edit flow never
  // has. Preserving each mode's existing behavior rather than unifying it,
  // since that's a separate decision from merging the two forms.
  const validateMachineShopData = () => {
    const errors: { [key: string]: string } = {};

    if (!machineShopData.action) {
      errors.action = "Please select an action needed";
    }
    if (machineShopData.action === "other" && !machineShopData.actionOther?.trim()) {
      errors.actionOther = "Please specify the other action needed";
    }
    if (machineShopData.actionOther && machineShopData.actionOther.length > 100) {
      errors.actionOther = "Action description must be 100 characters or less";
    }
    if (!machineShopData.material) {
      errors.material = "Please select a material type";
    }
    if (machineShopData.material === "other" && !machineShopData.materialOther?.trim()) {
      errors.materialOther = "Please specify the other material type";
    }

    const materialOtherMaxLength = mode === 'create' ? 50 : 100;
    if (machineShopData.materialOther && machineShopData.materialOther.length > materialOtherMaxLength) {
      errors.materialOther = `Material description must be ${materialOtherMaxLength} characters or less`;
    }

    if (mode === 'create') {
      if (!machineShopData.isTeamLabeled) {
        errors.isTeamLabeled = "Material must be labeled with team name for safety";
      }
      if (!machineShopData.isDimensionallyMarked) {
        errors.isDimensionallyMarked = "Material must be dimensionally marked for safety";
      }
    }

    return errors;
  };

  const validateBatteryChargingData = () => {
    const errors: { [key: string]: string } = {};
    if (!batteryChargingData.batteryType) errors.batteryType = "Please select a battery type";
    if (
      mode === 'create' &&
      batteryChargingData.loanerProvided !== false &&
      batteryChargingData.batteryType &&
      !batteryChargingData.loanerBatteryNumber
    ) {
      errors.loanerBatteryNumber = "Please select which battery is being handed out";
    }
    return errors;
  };

  const validateFormData = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.country_code?.trim()) {
      errors.country_code = "Please select a country";
    }
    if (!formData.type) {
      errors.type = "Please select a request type";
    }
    if (formData.comments && formData.comments.length > 500) {
      errors.comments = "Comments must be 500 characters or less";
    }
    if (formData.assigned_to && !users.find(user => user.id === formData.assigned_to)) {
      errors.assigned_to = "Please select a valid user";
    }

    if (formData.type === "hardware") {
      Object.assign(errors, validateHardwareData());
    } else if (formData.type === "software") {
      Object.assign(errors, validateSoftwareData());
    } else if (formData.type === "machine_shop") {
      Object.assign(errors, validateMachineShopData());
    } else if (formData.type === "battery_charging") {
      Object.assign(errors, validateBatteryChargingData());
    }

    return errors;
  };

  const isFormValid = () => Object.keys(validateFormData()).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateFormData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError(`Please fix the validation errors before ${mode === 'create' ? 'submitting' : 'saving'}`);
      return;
    }

    setLoading(true);
    setError("");
    setValidationErrors({});

    try {
      if (mode === 'edit') {
        if (!request) return;

        const requestBody: {
          comments: string;
          status: string;
          country_code: string;
          assigned_to: string | null;
          hardwareData?: HardwareRequestData;
          softwareData?: SoftwareRequestData;
          machineShopData?: MachineShopRequestData;
          batteryChargingData?: BatteryChargingRequestData;
        } = {
          comments: formData.comments,
          status: formData.status,
          country_code: formData.country_code,
          assigned_to: formData.assigned_to || null,
        };

        switch (formData.type) {
          case "hardware":
            requestBody.hardwareData = hardwareData;
            break;
          case "software":
            requestBody.softwareData = softwareData;
            break;
          case "machine_shop":
            requestBody.machineShopData = machineShopData;
            break;
          case "battery_charging":
            requestBody.batteryChargingData = batteryChargingData;
            break;
        }

        const response = await fetch(`/api/requests/${request.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update request');
        }

        const updatedRequest = await response.json();
        onRequestUpdated?.(updatedRequest);
      } else {
        const requestBody: {
          countryCode: string;
          type: string;
          comments?: string;
          assignedTo?: string;
          hardwareData?: HardwareRequestData;
          softwareData?: SoftwareRequestData;
          machineShopData?: MachineShopRequestData;
          batteryChargingData?: BatteryChargingRequestData;
        } = {
          countryCode: formData.country_code,
          type: formData.type,
          comments: formData.comments?.trim() || undefined,
          assignedTo: formData.assigned_to || undefined,
        };

        switch (formData.type) {
          case "hardware":
            requestBody.hardwareData = hardwareData;
            break;
          case "software":
            requestBody.softwareData = softwareData;
            break;
          case "machine_shop":
            requestBody.machineShopData = machineShopData;
            break;
          case "battery_charging":
            requestBody.batteryChargingData = batteryChargingData;
            break;
        }

        const response = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create request');
        }

        const newRequest = await response.json();
        onRequestCreated?.(newRequest);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode === 'create' ? 'create' : 'update'} request`);
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case "hardware":
        return <HardwareFields data={hardwareData} onChange={handleHardwareChange} errors={validationErrors} />;
      case "software":
        return <SoftwareFields data={softwareData} onChange={handleSoftwareChange} errors={validationErrors} />;
      case "machine_shop":
        return <MachineShopFields data={machineShopData} onChange={handleMachineShopChange} errors={validationErrors} />;
      case "battery_charging":
        return (
          <BatteryChargingFields
            data={batteryChargingData}
            onChange={handleBatteryChargingChange}
            errors={validationErrors}
            mode={mode}
            availableBatteryNumbers={availableBatteryNumbers}
          />
        );
      default:
        return null;
    }
  };

  // In create mode, only offer types the user can actually create; a
  // fixedType (from a type-specific page) narrows that further to just
  // itself, so the picker shows a single, non-interactive option.
  const typeOptions = mode === 'create'
    ? ALL_TYPE_OPTIONS.filter(option => (fixedType ? option.value === fixedType : canAccess(option.value, 'create')))
    : ALL_TYPE_OPTIONS;
  const typeLocked = mode === 'edit' || !!fixedType;

  return {
    mode,
    fixedType,
    formData,
    hardwareData,
    softwareData,
    machineShopData,
    batteryChargingData,
    error,
    loading,
    validationErrors,
    users,
    outstandingBatteryRequests,
    availableBatteryNumbers,
    handleChange,
    handleTypeChange,
    handleHardwareChange,
    handleSoftwareChange,
    handleMachineShopChange,
    handleBatteryChargingChange,
    isFormValid,
    handleSubmit,
    renderTypeSpecificFields,
    typeOptions,
    typeLocked,
    resetForm,
  };
}

export type RequestFormState = ReturnType<typeof useRequestForm>;
