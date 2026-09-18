import { NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/authn';

/**
 * Returns the current AppSession (user + roles + expires), or 401.
 * Supabase's JWT doesn't carry app roles, so SessionContext calls this
 * once per auth-state change to resolve them.
 */
export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(session);
}
