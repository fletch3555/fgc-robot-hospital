import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/database';
import { ITeam } from '@/lib/types';

export class Team {
  static async findById(id: string): Promise<ITeam | null> {
    try {
      const result = await query('SELECT * FROM teams WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding team by ID:', error);
      throw error;
    }
  }

  static async findByCountryCode(countryCode: string): Promise<ITeam | null> {
    try {
      const result = await query('SELECT * FROM teams WHERE country_code = $1', [countryCode.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding team by country code:', error);
      throw error;
    }
  }

  static async findAll(filters: {
    atEvent?: boolean;
    countryCode?: string;
  } = {}): Promise<ITeam[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: unknown[] = [];
      let paramCount = 0;

      if (filters.atEvent !== undefined) {
        whereClause += ` AND at_event = $${++paramCount}`;
        values.push(filters.atEvent);
      }
      if (filters.countryCode) {
        whereClause += ` AND country_code = $${++paramCount}`;
        values.push(filters.countryCode);
      }

      const result = await query(
        `SELECT * FROM teams ${whereClause} ORDER BY country_name ASC`,
        values
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding teams:', error);
      throw error;
    }
  }

  static async create(teamData: {
    countryCode: string;
    countryName: string;
    atEvent?: boolean;
  }): Promise<ITeam> {
    try {
      const id = uuidv4();
      
      const result = await query(
        `INSERT INTO teams (id, country_code, country_name, at_event) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [
          id,
          teamData.countryCode.toUpperCase(),
          teamData.countryName,
          teamData.atEvent ?? true
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<ITeam>): Promise<ITeam | null> {
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
        else if (key === 'atEvent') columnName = 'at_event';
        
        setParts.push(`${columnName} = $${++paramCount}`);
        values.push(value);
      });

      if (setParts.length === 0) {
        throw new Error('No valid updates provided');
      }

      const result = await query(
        `UPDATE teams SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM teams WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }

  static async setEventStatus(countryCode: string, atEvent: boolean): Promise<ITeam | null> {
    try {
      const result = await query(
        `UPDATE teams SET at_event = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE country_code = $1 RETURNING *`,
        [countryCode.toUpperCase(), atEvent]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating team event status:', error);
      throw error;
    }
  }

  static async getTeamsAtEvent(): Promise<ITeam[]> {
    try {
      const result = await query(
        'SELECT * FROM teams WHERE at_event = true ORDER BY country_name ASC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting teams at event:', error);
      throw error;
    }
  }

  static async getTeamStats(): Promise<{
    total: number;
    atEvent: number;
    notAtEvent: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN at_event = true THEN 1 END) as at_event,
          COUNT(CASE WHEN at_event = false THEN 1 END) as not_at_event
        FROM teams
      `);
      
      return {
        total: parseInt(result.rows[0].total),
        atEvent: parseInt(result.rows[0].at_event),
        notAtEvent: parseInt(result.rows[0].not_at_event)
      };
    } catch (error) {
      console.error('Error getting team stats:', error);
      throw error;
    }
  }
}