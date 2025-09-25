import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/database';
import { checkPermissions } from '@/lib/authz';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
      const authResult = await checkPermissions(['admin.users']);
      
      if (!authResult.authorized) {
        return authResult.response!;
      }

    const { id } = await params;

    await connectToDatabase();

    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkPermissions(['admin.users']);
    
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = await params;
    const updateData = await request.json();

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await User.update(id, updateData);

    return NextResponse.json({
      _id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      roles: updatedUser!.roles,
      createdAt: updatedUser!.created_at,
      updatedAt: updatedUser!.updated_at
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkPermissions(['admin.users']);
    
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = await params;

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent user from deleting themselves
    if (user.id === authResult.session!.user!.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await User.delete(id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}