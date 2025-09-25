import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, PermissionDB } from '@/lib/authz';
import { Role } from '@/lib/auth-types';

export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const session = authz.session!;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as Role;
    const userId = searchParams.get('userId');

    // Support both legacy role-based and new user-based permission fetching
    if (userId) {
      // New multi-role approach: fetch permissions for user ID
      const userRoles = session.user?.roles || [];
      const isAdmin = userRoles.includes('admin');
      
      // Users can only fetch permissions for themselves (except admins)
      if (!isAdmin && session.user?.id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const permissions = await PermissionDB.getPermissionsForUser(userId);
      const permissionNames = permissions.map(p => p.name);

      return NextResponse.json({ 
        permissions: permissionNames,
        roles: userRoles,
        userId: userId
      });
    } else if (role) {
      // Legacy single-role approach: fetch permissions for specific role
      const userRoles = session.user?.roles || [];
      const isAdmin = userRoles.includes('admin');
      
      if (!isAdmin && !userRoles.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const permissions = await PermissionDB.getPermissionsForRole(role);
      const permissionNames = permissions.map(p => p.name);

      return NextResponse.json({ 
        permissions: permissionNames,
        role: role
      });
    } else {
      return NextResponse.json({ error: 'Either role or userId parameter is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}