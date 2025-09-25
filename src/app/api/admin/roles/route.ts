import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions, PermissionDB, getRolesWithPermissions } from '@/lib/authz';

export async function GET() {
  try {
    const authz = await checkPermissions(['admin.roles']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    // Get all roles with their permissions
    const rolesWithPermissions = await getRolesWithPermissions();

    return NextResponse.json(rolesWithPermissions);
  } catch (error) {
    console.error('Error fetching roles:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// Get permissions for a specific role
export async function POST(request: NextRequest) {
  try {
    const authz = await checkPermissions(['admin.roles']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const { role } = await request.json();
    
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const permissions = await PermissionDB.getPermissionsForRole(role);
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}