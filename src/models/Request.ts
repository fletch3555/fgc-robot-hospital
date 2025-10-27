import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/database';
import { 
  IRequest, 
  HardwareRequestData, 
  SoftwareRequestData, 
  MachineShopRequestData, 
  BatteryChargingRequestData, 
  RequestType
} from '@/lib/types';
import { getCurrentUTCTimestamp } from '@/lib/dateUtils';

export class Request {
  static async findById(id: string): Promise<IRequest | null> {
    try {
      const result = await query(
        `SELECT r.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as assigned_to_name, u2.email as assigned_to_email
         FROM requests r
         LEFT JOIN users u1 ON r.submitted_by = u1.id
         LEFT JOIN users u2 ON r.assigned_to = u2.id
         WHERE r.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding request by ID:', error);
      throw error;
    }
  }

  static async findAll(filters: {
    status?: string;
    type?: string;
    submittedBy?: string;
    assignedTo?: string;
    countryCode?: string;
  } = {}): Promise<IRequest[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: unknown[] = [];
      let paramCount = 0;

      if (filters.status) {
        whereClause += ` AND r.status = $${++paramCount}`;
        values.push(filters.status);
      }
      if (filters.type) {
        whereClause += ` AND r.type = $${++paramCount}`;
        values.push(filters.type);
      }
      if (filters.submittedBy) {
        whereClause += ` AND r.submitted_by = $${++paramCount}`;
        values.push(filters.submittedBy);
      }
      if (filters.assignedTo) {
        whereClause += ` AND r.assigned_to = $${++paramCount}`;
        values.push(filters.assignedTo);
      }
      if (filters.countryCode) {
        whereClause += ` AND r.country_code = $${++paramCount}`;
        values.push(filters.countryCode);
      }

      const result = await query(
        `SELECT r.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as assigned_to_name, u2.email as assigned_to_email
         FROM requests r
         LEFT JOIN users u1 ON r.submitted_by = u1.id
         LEFT JOIN users u2 ON r.assigned_to = u2.id
         ${whereClause}
         AND r.status != 'completed'
         ORDER BY 
           CASE r.status 
             WHEN 'in-progress' THEN 1 
             WHEN 'open' THEN 2 
             ELSE 3 
           END,
           r.created_at DESC`,
        values
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding requests:', error);
      throw error;
    }
  }
  static async findRecentlyClosed(limit: number = 10): Promise<IRequest[]> {
    try {
      const result = await query(
        `SELECT r.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as assigned_to_name, u2.email as assigned_to_email
         FROM requests r
         LEFT JOIN users u1 ON r.submitted_by = u1.id
         LEFT JOIN users u2 ON r.assigned_to = u2.id
         WHERE r.status = 'completed'
         ORDER BY r.updated_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding recently closed requests:', error);
      throw error;
    }
  }


  static async findAllForAdmin(): Promise<IRequest[]> {
    try {
      const result = await query(
        `SELECT r.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as assigned_to_name, u2.email as assigned_to_email
         FROM requests r
         LEFT JOIN users u1 ON r.submitted_by = u1.id
         LEFT JOIN users u2 ON r.assigned_to = u2.id
         ORDER BY 
           CASE r.status 
             WHEN 'in-progress' THEN 1 
             WHEN 'open' THEN 2 
             WHEN 'completed' THEN 3 
             ELSE 4 
           END,
           r.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding all requests for admin:', error);
      throw error;
    }
  }

  static async create(requestData: {
    countryCode: string;
    type: RequestType; // 'hardware' | 'software' | 'machine_shop' | 'battery_charging';
    comments?: string;
    assignedTo?: string;
    // priority: 'low' | 'medium' | 'high' | 'urgent';
    submittedBy: string;
    hardwareData?: HardwareRequestData;
    softwareData?: SoftwareRequestData;
    machineShopData?: MachineShopRequestData;
    batteryChargingData?: BatteryChargingRequestData;
  }): Promise<IRequest> {
    try {
      const id = uuidv4();
      const utcTimestamp = getCurrentUTCTimestamp();
      
      const result = await query(
        `INSERT INTO requests (
           id, country_code, type, comments, assigned_to,
           status, submitted_by, hardware_data, software_data, machine_shop_data, battery_charging_data,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          id,
          requestData.countryCode.toUpperCase(),
          requestData.type,
          requestData.comments || null,
          requestData.assignedTo || null,
          // requestData.priority,
          'open',
          requestData.submittedBy,
          requestData.hardwareData ? JSON.stringify(requestData.hardwareData) : null,
          requestData.softwareData ? JSON.stringify(requestData.softwareData) : null,
          requestData.machineShopData ? JSON.stringify(requestData.machineShopData) : null,
          requestData.batteryChargingData ? JSON.stringify(requestData.batteryChargingData) : null,
          utcTimestamp,
          utcTimestamp
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<IRequest>): Promise<IRequest | null> {
    try {
      const setParts: string[] = [];
      const values: unknown[] = [id];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'id') return; // Skip ID updates
        
        let columnName = key;
        // Convert camelCase to snake_case for database columns
        if (key === 'countryCode') columnName = 'country_code';
        else if (key === 'countryName') columnName = 'country_name';
        else if (key === 'submittedBy') columnName = 'submitted_by';
        else if (key === 'assignedTo') columnName = 'assigned_to';
        else if (key === 'hardwareData') columnName = 'hardware_data';
        else if (key === 'softwareData') columnName = 'software_data';
        else if (key === 'machineShopData') columnName = 'machine_shop_data';
        else if (key === 'batteryChargingData') columnName = 'battery_charging_data';
        
        setParts.push(`${columnName} = $${++paramCount}`);
        
        // Handle JSON data
        if (['hardwareData', 'softwareData', 'machineShopData', 'batteryChargingData'].includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });

      if (setParts.length === 0) {
        throw new Error('No valid updates provided');
      }

      values.push(getCurrentUTCTimestamp());
      const result = await query(
        `UPDATE requests SET ${setParts.join(', ')}, updated_at = $${values.length} 
         WHERE id = $1 RETURNING *`,
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM requests WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  }

  static async findByUser(userId: string, role: 'submitted' | 'assigned' = 'submitted'): Promise<IRequest[]> {
    try {
      const column = role === 'submitted' ? 'submitted_by' : 'assigned_to';
      const result = await query(
        `SELECT r.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as assigned_to_name, u2.email as assigned_to_email
         FROM requests r
         LEFT JOIN users u1 ON r.submitted_by = u1.id
         LEFT JOIN users u2 ON r.assigned_to = u2.id
         WHERE r.${column} = $1
         ORDER BY r.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding requests by user:', error);
      throw error;
    }
  }

  static async assignTo(requestId: string, assignedToId: string | null): Promise<IRequest | null> {
    try {
      const result = await query(
        `UPDATE requests SET assigned_to = $2, updated_at = $3 
         WHERE id = $1 RETURNING *`,
        [requestId, assignedToId, getCurrentUTCTimestamp()]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error assigning request:', error);
      throw error;
    }
  }

  static async updateStatus(requestId: string, status: 'pending' | 'in_progress' | 'completed' | 'canceled'): Promise<IRequest | null> {
    try {
      const result = await query(
        `UPDATE requests SET status = $2, updated_at = $3 
         WHERE id = $1 RETURNING *`,
        [requestId, status, getCurrentUTCTimestamp()]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }
}