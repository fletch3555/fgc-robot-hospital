import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "./authn";
import { User } from "@/models/User";

/**
 * Server-side permission checking utility for API routes
 */
export async function checkPermissions(requiredPermissions: string[], requireAll = true) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // Admin users have all permissions
  if (session.user.roles?.includes('admin')) {
    return { 
      authorized: true, 
      response: null,
      session 
    };
  }

  try {
    const userPermissions = await User.getUserPermissions(session.user.id);
    
    let hasPermission = false;
    if (requireAll) {
      // User must have ALL required permissions
      hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
    } else {
      // User must have ANY of the required permissions
      hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );
    }

    if (!hasPermission) {
      return { 
        authorized: false, 
        response: NextResponse.json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
          requireAll 
        }, { status: 403 })
      };
    }

    return { 
      authorized: true, 
      response: null,
      session 
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { 
      authorized: false, 
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    };
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    return await User.hasPermission(userId, permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    return await User.getUserPermissions(userId);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}