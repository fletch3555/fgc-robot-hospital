import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/database';

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

    // Check if user with email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      roles
    });

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