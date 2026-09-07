import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/database';
import { checkPermissions } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';

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

    // Keep the login email in sync with the displayed one — otherwise they
    // silently diverge, since Supabase Auth (not this table) owns the
    // credential the user actually signs in with.
    if (updateData.email && updateData.email !== user.email) {
      const admin = createAdminClient();
      const { error: emailError } = await admin.auth.admin.updateUserById(id, { email: updateData.email });
      if (emailError) {
        return NextResponse.json({ error: emailError.message }, { status: 400 });
      }
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

    // Deletes the Supabase Auth identity; the users/user_roles rows cascade
    // via the users.id -> auth.users(id) FK (see migrations/0003). If this
    // user has existing requests/spare-parts (no cascade there), the
    // cascade fails and this call errors instead of leaving a partial delete.
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}