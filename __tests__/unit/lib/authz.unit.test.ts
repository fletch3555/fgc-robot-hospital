/**
 * Unit Tests for Authorization Utilities - authz.ts
 * 
 * Tests for pure permission registry functions that don't require external dependencies.
 * These are true unit tests that test individual functions in isolation.
 */

import { Permission, PermissionName } from '@/lib/auth-types';

describe('Authorization Utilities - Unit Tests', () => {
  
  describe('getAllPermissions', () => {
    let getAllPermissions: () => Permission[];
    
    beforeAll(async () => {
      const authzModule = await import('../../../src/lib/authz');
      getAllPermissions = authzModule.getAllPermissions;
    });

    it('should return an array of permissions', () => {
      const permissions = getAllPermissions();
      
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return permissions with required fields', () => {
      const permissions = getAllPermissions();
      
      permissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('name');
        expect(permission).toHaveProperty('description');
        expect(permission).toHaveProperty('category');
        expect(typeof permission.name).toBe('string');
        expect(typeof permission.description).toBe('string');
        expect(typeof permission.category).toBe('string');
      });
    });

    it('should return consistent results on multiple calls', () => {
      const permissions1 = getAllPermissions();
      const permissions2 = getAllPermissions();
      
      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('getPermissionsByCategory', () => {
    let getPermissionsByCategory: () => Record<string, Permission[]>;
    
    beforeAll(async () => {
      const authzModule = await import('../../../src/lib/authz');
      getPermissionsByCategory = authzModule.getPermissionsByCategory;
    });

    it('should return permissions grouped by category', () => {
      const grouped = getPermissionsByCategory();
      
      expect(typeof grouped).toBe('object');
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });

    it('should have valid category groupings', () => {
      const grouped = getPermissionsByCategory();
      
      Object.entries(grouped).forEach(([category, permissions]) => {
        expect(typeof category).toBe('string');
        expect(Array.isArray(permissions)).toBe(true);
        expect(permissions.length).toBeGreaterThan(0);
        
        // All permissions in a category should have that category
        permissions.forEach((permission: Permission) => {
          expect(permission.category).toBe(category);
        });
      });
    });

    it('should contain expected categories', () => {
      const grouped = getPermissionsByCategory();
      const categories = Object.keys(grouped);
      
      // Check for some expected categories (based on the permission system)
      expect(categories).toContain('requests');
      expect(categories).toContain('admin');
    });
  });

  describe('getPermission', () => {
    let getPermission: (name: PermissionName) => Permission;
    
    beforeAll(async () => {
      const authzModule = await import('../../../src/lib/authz');
      getPermission = authzModule.getPermission;
    });

    it('should return specific permission by name', () => {
      // Test with a known permission name
      const permission = getPermission('requests.view');
      
      expect(permission).toBeDefined();
      expect(permission.name).toBe('requests.view');
      expect(permission).toHaveProperty('description');
      expect(permission).toHaveProperty('category');
    });

    it('should return consistent results for same permission name', () => {
      const permission1 = getPermission('requests.view');
      const permission2 = getPermission('requests.view');
      
      expect(permission1).toEqual(permission2);
      expect(permission1).toBe(permission2); // Should be the same object reference
    });
  });
});