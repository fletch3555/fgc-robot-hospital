// PostgreSQL Database Types (using snake_case for database fields)

export type UserRole = 'guest' | 'intake_clerk' | 'machine_shop_operator' | 'spare_parts_attendant' | 'flying_squad_software' | 'flying_squad_hardware' | 'robot_inspector' | 'lead_robot_inspector' | 'admin';

export interface IRole {
  id: string;
  name: string;
  description: string;
  created_at: Date;
}

export interface IUserRole {
  id: string;
  user_id: string;
  role_id: string;
  granted_at: Date;
  granted_by?: string;
}

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles?: UserRole[]; // Array of roles for multi-role support
  created_at: Date;
  updated_at: Date;
}

export type RequestType = 'hardware' | 'software' | 'machine_shop' | 'battery_charging';
// export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'open' | 'in-progress' | 'completed';

export interface IRequest {
  id: string;
  country_code: string;
  comments?: string;
  type: RequestType;
  // priority: RequestPriority;
  status: RequestStatus;
  submitted_by: string; // UUID reference to users.id
  assigned_to?: string; // UUID reference to users.id
  submitted_by_name?: string; // User name who submitted
  submitted_by_email?: string; // User email who submitted
  assigned_to_name?: string; // User name who is assigned
  assigned_to_email?: string; // User email who is assigned
  hardware_data?: HardwareRequestData;
  software_data?: SoftwareRequestData;
  machine_shop_data?: MachineShopRequestData;
  battery_charging_data?: BatteryChargingRequestData;
  created_at: Date;
  updated_at: Date;
}

export type SparePartStatus = 'issued' | 'returned';

export interface ISparePart {
  id: string;
  country_code: string;
  country_name: string;
  item_name: string;
  quantity: number;
  is_loan: boolean;
  status: SparePartStatus;
  submitted_by: string; // UUID reference to users.id
  handled_by?: string; // UUID reference to users.id
  notes?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ITeam {
  id: string;
  country_code: string;
  country_name: string;
  created_at: Date;
  updated_at: Date;
}

// Request type-specific data interfaces (camelCase for React/Node.js)
export interface HardwareRequestData {
  type?: 'mechanism_build' | 'troubleshooting' | 'need_tools' | 'other';
  location?: 'hospital' | 'pit';
}

export interface SoftwareRequestData {
  programmingLanguage?: string;
  type?: string;
}

export interface MachineShopRequestData {
  action?: string;
  actionOther?: string;
  material?: string;
  materialOther?: string;
  drawings?: string[];
  isTeamLabeled?: boolean;
  isDimensionallyMarked?: boolean;
}

export interface BatteryChargingRequestData {
  batteryType?: 'driver_hub' | 'robot_battery';
  initialCharge?: number;
}

// FGC Inventory Types (snake_case for database compatibility)
export type ReviewStatus = 'normal' | 'needs_software_review' | 'needs_hardware_review' | 'approval_needed' | 'do_not_loan';

export interface IKoPItem {
  id: string;
  group_name: string;
  part_number: string;
  description: string;
  quantity: number;
  review_status: ReviewStatus;
  image_url?: string;
}

// API response types (simplified versions for frontend use)
export interface IUserSummary {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface IUserAdmin extends IUserSummary {
  _id: string; // Admin API uses _id instead of id
  createdAt: string;
  updatedAt: string;
}