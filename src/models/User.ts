import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/database';
import { IUser } from '@/lib/types';

export class User {
  static async findById(id: string): Promise<IUser | null> {
    try {
      const result = await query(
        `SELECT u.*, 
                COALESCE(
                  array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), 
                  ARRAY[]::VARCHAR[]
                ) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    try {
      const result = await query(
        `SELECT u.*, 
                COALESCE(
                  array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), 
                  ARRAY[]::VARCHAR[]
                ) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.email = $1
         GROUP BY u.id`,
        [email.toLowerCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(userData: {
    email: string;
    password: string;
    name: string;
    roles?: string[]; // Array of role IDs
  }): Promise<IUser> {
    try {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user without roles first
      const result = await query(
        `INSERT INTO users (id, email, password, name) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [id, userData.email.toLowerCase(), hashedPassword, userData.name]
      );
      
      const user = result.rows[0];
      
      // Add default guest role if no roles specified
      const rolesToAssign = userData.roles && userData.roles.length > 0 ? userData.roles : ['guest'];
      
      // Assign roles
      for (const roleId of rolesToAssign) {
        await query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [user.id, roleId]
        );
      }
      
      // Return user with roles
      return await User.findById(id) as IUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Add role to user
  static async addRole(userId: string, roleId: string, grantedBy?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO user_roles (user_id, role_id, granted_by) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId, grantedBy]
      );
    } catch (error) {
      console.error('Error adding role to user:', error);
      throw error;
    }
  }

  // Remove role from user
  static async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      await query(
        `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
        [userId, roleId]
      );
    } catch (error) {
      console.error('Error removing role from user:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    try {
      // Separate roles from other updates
      const { roles, ...otherUpdates } = updates;
      
      // Update basic user fields if any
      if (Object.keys(otherUpdates).length > 0) {
        const setClause = Object.keys(otherUpdates)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');
        
        const values = [id, ...Object.values(otherUpdates)];
        
        await query(
          `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          values
        );
      }
      
      // Update roles if provided
      if (roles && Array.isArray(roles)) {
        // Remove all existing roles for this user
        await query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        
        // Add new roles
        for (const roleId of roles) {
          await query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [id, roleId]
          );
        }
      }
      
      // Return updated user with roles
      return await User.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async findAll(): Promise<IUser[]> {
    try {
      const result = await query(
        `SELECT u.*, 
                COALESCE(
                  array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), 
                  ARRAY[]::VARCHAR[]
                ) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         GROUP BY u.id`,
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  static async findByRoles(roles: string[]): Promise<IUser[]> {
    try {
      const placeholders = roles.map((_, index) => `$${index + 1}`).join(', ');
      const result = await query(
        `SELECT * FROM users WHERE role IN (${placeholders}) ORDER BY name ASC`,
        roles
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding users by roles:', error);
      throw error;
    }
  }

  static async findByPermissions(permissions: string[]): Promise<IUser[]> {
    try {
      const placeholders = permissions.map((_, index) => `$${index + 1}`).join(', ');
      const result = await query(
        `SELECT u.*,
                COALESCE(
                  array_agg(DISTINCT ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL),
                  ARRAY[]::VARCHAR[]
                ) as roles
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN role_permissions rp ON ur.role_id = rp.role
        WHERE rp.permission_name IN (${placeholders})
        GROUP BY u.id
        ORDER BY u.name ASC`,
        permissions
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding users by permissions:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM users WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}