import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/database';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const authResult = await checkPermissions(['admin.users']);
    
    if (!authResult.authorized) {
      return authResult.response!;
    }

    await connectToDatabase();

    // For now, just return all users - pagination can be added later
    const users = await User.findAll();

    return NextResponse.json({
      users: users.map(user => ({
        _id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      pagination: {
        page: 1,
        limit: users.length,
        total: users.length,
        pages: 1
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkPermissions(['admin.users']);
    
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { name, email, password, roles } = await request.json();

    if (!name || !email || !password || !roles) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Cheap pre-check; Supabase Auth's own uniqueness check below is authoritative.
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // admin-provisioned accounts are usable immediately
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 400 });
    }

    let newUser;
    try {
      newUser = await User.create({
        id: created.user.id,
        name,
        email,
        roles
      });
    } catch (error) {
      // Compensate: don't leave an orphaned Supabase Auth identity with no app profile.
      await admin.auth.admin.deleteUser(created.user.id);
      throw error;
    }

    return NextResponse.json({
      _id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roles: newUser.roles,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}