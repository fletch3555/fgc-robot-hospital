import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/database';
import { ISparePart } from '@/lib/types';
import { getCountryName } from '@/lib/countryUtils';

export class SparePart {
  static async findById(id: string): Promise<ISparePart | null> {
    try {
      const result = await query(
        `SELECT sp.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as handled_by_name, u2.email as handled_by_email
         FROM spare_parts sp
         LEFT JOIN users u1 ON sp.submitted_by = u1.id
         LEFT JOIN users u2 ON sp.handled_by = u2.id
         WHERE sp.id = $1`,
        [id]
      );
      
      const sparePart = result.rows[0];
      if (sparePart) {
        // Add country name through lookup
        sparePart.country_name = getCountryName(sparePart.country_code);
      }
      
      return sparePart || null;
    } catch (error) {
      console.error('Error finding spare part by ID:', error);
      throw error;
    }
  }

  static async findAll(filters: {
    status?: string;
    isLoan?: boolean;
    submittedBy?: string;
    handledBy?: string;
    countryCode?: string;
  } = {}): Promise<ISparePart[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: unknown[] = [];
      let paramCount = 0;

      if (filters.status) {
        whereClause += ` AND sp.status = $${++paramCount}`;
        values.push(filters.status);
      }
      if (filters.isLoan !== undefined) {
        whereClause += ` AND sp.is_loan = $${++paramCount}`;
        values.push(filters.isLoan);
      }
      if (filters.submittedBy) {
        whereClause += ` AND sp.submitted_by = $${++paramCount}`;
        values.push(filters.submittedBy);
      }
      if (filters.handledBy) {
        whereClause += ` AND sp.handled_by = $${++paramCount}`;
        values.push(filters.handledBy);
      }
      if (filters.countryCode) {
        whereClause += ` AND sp.country_code = $${++paramCount}`;
        values.push(filters.countryCode);
      }

      const result = await query(
        `SELECT sp.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as handled_by_name, u2.email as handled_by_email
         FROM spare_parts sp
         LEFT JOIN users u1 ON sp.submitted_by = u1.id
         LEFT JOIN users u2 ON sp.handled_by = u2.id
         ${whereClause}
         ORDER BY sp.created_at DESC`,
        values
      );
      
      // Add country names through lookup
      const spareParts = result.rows.map((sparePart: ISparePart) => ({
        ...sparePart,
        country_name: getCountryName(sparePart.country_code)
      }));
      
      return spareParts;
    } catch (error) {
      console.error('Error finding spare parts:', error);
      throw error;
    }
  }

  static async create(sparePartData: {
    countryCode: string;
    itemName: string;
    quantity: number;
    isLoan: boolean;
    submittedBy: string;
    notes?: string[];
  }): Promise<ISparePart> {
    try {
      const id = uuidv4();
      
      const result = await query(
        `INSERT INTO spare_parts (
           id, country_code, item_name, quantity, 
           is_loan, status, submitted_by, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          id,
          sparePartData.countryCode.toUpperCase(),
          sparePartData.itemName,
          sparePartData.quantity,
          sparePartData.isLoan,
          'issued',
          sparePartData.submittedBy,
          JSON.stringify(sparePartData.notes || [])
        ]
      );
      
      const sparePart = result.rows[0];
      // Add country name through lookup
      sparePart.country_name = getCountryName(sparePart.country_code);
      
      return sparePart;
    } catch (error) {
      console.error('Error creating spare part:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<ISparePart>): Promise<ISparePart | null> {
    try {
      const setParts: string[] = [];
      const values: unknown[] = [id];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'id' || key === 'countryName') return; // Skip ID updates and countryName (not stored in DB)
        
        let columnName = key;
        // Convert camelCase to snake_case for database columns
        if (key === 'countryCode') columnName = 'country_code';
        else if (key === 'itemName') columnName = 'item_name';
        else if (key === 'isLoan') columnName = 'is_loan';
        else if (key === 'submittedBy') columnName = 'submitted_by';
        else if (key === 'handledBy') columnName = 'handled_by';
        
        setParts.push(`${columnName} = $${++paramCount}`);
        
        // Handle JSON data for notes
        if (key === 'notes') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });

      if (setParts.length === 0) {
        throw new Error('No valid updates provided');
      }

      const result = await query(
        `UPDATE spare_parts SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        values
      );
      
      const sparePart = result.rows[0];
      if (sparePart) {
        // Add country name through lookup
        sparePart.country_name = getCountryName(sparePart.country_code);
      }
      
      return sparePart || null;
    } catch (error) {
      console.error('Error updating spare part:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM spare_parts WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting spare part:', error);
      throw error;
    }
  }

  static async findByUser(userId: string, role: 'submitted' | 'handled' = 'submitted'): Promise<ISparePart[]> {
    try {
      const column = role === 'submitted' ? 'submitted_by' : 'handled_by';
      const result = await query(
        `SELECT sp.*, 
                u1.name as submitted_by_name, u1.email as submitted_by_email,
                u2.name as handled_by_name, u2.email as handled_by_email
         FROM spare_parts sp
         LEFT JOIN users u1 ON sp.submitted_by = u1.id
         LEFT JOIN users u2 ON sp.handled_by = u2.id
         WHERE sp.${column} = $1
         ORDER BY sp.created_at DESC`,
        [userId]
      );
      
      // Add country names through lookup
      const spareParts = result.rows.map((sparePart: ISparePart) => ({
        ...sparePart,
        country_name: getCountryName(sparePart.country_code)
      }));
      
      return spareParts;
    } catch (error) {
      console.error('Error finding spare parts by user:', error);
      throw error;
    }
  }

  static async updateStatus(id: string, status: 'issued' | 'returned'): Promise<ISparePart | null> {
    try {
      const result = await query(
        `UPDATE spare_parts SET status = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        [id, status]
      );
      
      const sparePart = result.rows[0];
      if (sparePart) {
        // Add country name through lookup
        sparePart.country_name = getCountryName(sparePart.country_code);
      }
      
      return sparePart || null;
    } catch (error) {
      console.error('Error updating spare part status:', error);
      throw error;
    }
  }

  static async addNote(id: string, note: string): Promise<ISparePart | null> {
    try {
      const result = await query(
        `UPDATE spare_parts 
         SET notes = COALESCE(notes, '[]'::jsonb) || $2::jsonb,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        [id, JSON.stringify([note])]
      );
      
      const sparePart = result.rows[0];
      if (sparePart) {
        // Add country name through lookup
        sparePart.country_name = getCountryName(sparePart.country_code);
      }
      
      return sparePart || null;
    } catch (error) {
      console.error('Error adding note to spare part:', error);
      throw error;
    }
  }
}