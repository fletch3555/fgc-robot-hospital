import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authz';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.authorized || !authResult.session) {
      return authResult.response!;
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const email = authResult.session.user.email;
    const supabase = await createClient();

    // Verify the current password the same way sign-in does — Supabase's
    // updateUser() doesn't require this on its own, but we keep the same
    // security/UX bar as the old bcrypt-compare flow.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
