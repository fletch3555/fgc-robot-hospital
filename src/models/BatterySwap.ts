import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/database';
import { IBatterySwap, BatteryDeviceType, BatterySwapStatus } from '@/lib/types';
import { getCountryName } from '@/lib/countryUtils';
import { getCurrentSeason } from '@/lib/season';

export class BatterySwap {
  static async findById(id: string): Promise<IBatterySwap | null> {
    try {
      const result = await query(
        `SELECT bs.*,
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as handled_by_name, u2.email as handled_by_email
         FROM battery_swaps bs
         LEFT JOIN users u1 ON bs.submitted_by = u1.id
         LEFT JOIN users u2 ON bs.handled_by = u2.id
         WHERE bs.id = $1`,
        [id]
      );

      const swap = result.rows[0];
      if (swap) {
        swap.country_name = getCountryName(swap.country_code);
      }

      return swap || null;
    } catch (error) {
      console.error('Error finding battery swap by ID:', error);
      throw error;
    }
  }

  static async findAll(filters: {
    status?: BatterySwapStatus;
    deviceType?: BatteryDeviceType;
    countryCode?: string;
    submittedBy?: string;
    handledBy?: string;
    season?: number | 'all';
  } = {}): Promise<IBatterySwap[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: unknown[] = [];
      let paramCount = 0;

      const season = filters.season === undefined ? getCurrentSeason() : filters.season;
      if (season !== 'all') {
        whereClause += ` AND bs.season = $${++paramCount}`;
        values.push(season);
      }
      if (filters.status) {
        whereClause += ` AND bs.status = $${++paramCount}`;
        values.push(filters.status);
      }
      if (filters.deviceType) {
        whereClause += ` AND bs.device_type = $${++paramCount}`;
        values.push(filters.deviceType);
      }
      if (filters.countryCode) {
        whereClause += ` AND bs.country_code = $${++paramCount}`;
        values.push(filters.countryCode);
      }
      if (filters.submittedBy) {
        whereClause += ` AND bs.submitted_by = $${++paramCount}`;
        values.push(filters.submittedBy);
      }
      if (filters.handledBy) {
        whereClause += ` AND bs.handled_by = $${++paramCount}`;
        values.push(filters.handledBy);
      }

      const result = await query(
        `SELECT bs.*,
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as handled_by_name, u2.email as handled_by_email
         FROM battery_swaps bs
         LEFT JOIN users u1 ON bs.submitted_by = u1.id
         LEFT JOIN users u2 ON bs.handled_by = u2.id
         ${whereClause}
         ORDER BY bs.created_at DESC`,
        values
      );

      return result.rows.map((swap: IBatterySwap) => ({
        ...swap,
        country_name: getCountryName(swap.country_code)
      }));
    } catch (error) {
      console.error('Error finding battery swaps:', error);
      throw error;
    }
  }

  static async create(data: {
    countryCode: string;
    deviceType: BatteryDeviceType;
    submittedBy: string;
    notes?: string;
  }): Promise<IBatterySwap> {
    try {
      const id = uuidv4();

      const result = await query(
        `INSERT INTO battery_swaps (
           id, country_code, device_type, status, submitted_by, notes, season
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          id,
          data.countryCode.toUpperCase(),
          data.deviceType,
          'swapped',
          data.submittedBy,
          data.notes || null,
          getCurrentSeason()
        ]
      );

      const swap = result.rows[0];
      swap.country_name = getCountryName(swap.country_code);

      return swap;
    } catch (error) {
      console.error('Error creating battery swap:', error);
      throw error;
    }
  }

  static async update(id: string, updates: {
    countryCode?: string;
    deviceType?: BatteryDeviceType;
    notes?: string;
  }): Promise<IBatterySwap | null> {
    try {
      const setParts: string[] = [];
      const values: unknown[] = [id];
      let paramCount = 1;

      if (updates.countryCode !== undefined) {
        setParts.push(`country_code = $${++paramCount}`);
        values.push(updates.countryCode.toUpperCase());
      }
      if (updates.deviceType !== undefined) {
        setParts.push(`device_type = $${++paramCount}`);
        values.push(updates.deviceType);
      }
      if (updates.notes !== undefined) {
        setParts.push(`notes = $${++paramCount}`);
        values.push(updates.notes);
      }

      if (setParts.length === 0) {
        throw new Error('No valid updates provided');
      }

      const result = await query(
        `UPDATE battery_swaps SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        values
      );

      const swap = result.rows[0];
      if (swap) {
        swap.country_name = getCountryName(swap.country_code);
      }

      return swap || null;
    } catch (error) {
      console.error('Error updating battery swap:', error);
      throw error;
    }
  }

  static async markReturned(id: string, handledBy: string): Promise<IBatterySwap | null> {
    try {
      const result = await query(
        `UPDATE battery_swaps SET status = 'returned', handled_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id, handledBy]
      );

      const swap = result.rows[0];
      if (swap) {
        swap.country_name = getCountryName(swap.country_code);
      }

      return swap || null;
    } catch (error) {
      console.error('Error marking battery swap returned:', error);
      throw error;
    }
  }
}
