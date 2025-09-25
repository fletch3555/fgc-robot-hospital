import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions, PermissionDB } from '@/lib/authz';
import { Role } from '@/lib/auth-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const authz = await checkPermissions(['admin.roles']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const { role } = await params;
    const permissions = await PermissionDB.getPermissionsForRole(role as Role);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);

    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const authz = await checkPermissions(['admin.roles']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const { role } = await params;
    const { permissionIds } = await request.json();

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ error: 'Invalid permissionIds format' }, { status: 400 });
    }

    await PermissionDB.updateRolePermissions(role as Role, permissionIds);

    return NextResponse.json({ 
      success: true, 
      message: `Permissions updated for role: ${role}` 
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);

    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    );
  }
}