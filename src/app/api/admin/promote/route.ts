import { NextResponse } from 'next/server';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/database';
import { requireAuthentication } from '@/lib/authn';

export async function POST() {
  try {
    const authResult = await requireAuthentication();

    if (!authResult.authenticated || !authResult.user) {
      return authResult.response!;
    }

    await connectToDatabase();

    // Find user by email and promote to admin
    const user = await User.findByEmail(authResult.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await User.addRole(user.id, 'admin');
    const updatedUser = await User.findById(user.id);

    return NextResponse.json({ 
      message: 'User promoted to admin successfully',
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        roles: updatedUser!.roles
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}