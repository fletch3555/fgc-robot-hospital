import { createClient } from './server';
import { connectToDatabase } from '@/lib/database';
import { User } from '@/models/User';
import type { AppSession } from '@/lib/auth-types';

/**
 * The one place that asks Supabase "who is logged in," then resolves this
 * app's own roles for that user. Every other session/permission helper
 * (authn.ts, authz.ts) delegates here so there's a single source of truth.
 */
export async function getCurrentUserWithRoles(): Promise<AppSession | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
      return null;
    }

    const { sub: id, email, exp } = data.claims;
    if (!id) {
      return null;
    }

    await connectToDatabase();
    const dbUser = await User.findById(id);

    return {
      user: {
        id,
        name: dbUser?.name || '',
        email: dbUser?.email || email || '',
        roles: (dbUser?.roles && dbUser.roles.length > 0) ? dbUser.roles : ['guest'],
      },
      expires: exp ? new Date(exp * 1000).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error getting current user with roles:', error);
    return null;
  }
}
