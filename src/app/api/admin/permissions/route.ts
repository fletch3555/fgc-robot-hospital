import { NextRequest, NextResponse } from 'next/server';
import { getAllPermissions, checkPermissions } from '@/lib/authz';

export async function GET() {
  try {
    const authz = await checkPermissions(['admin.permissions']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const permissions = getAllPermissions();
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await checkPermissions(['admin.permissions']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const { name, category } = await request.json();

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // This would create a new permission (not implemented in basic model)
    // For now, permissions are predefined in the schema
    return NextResponse.json(
      { error: 'Permission creation not implemented - permissions are predefined' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}