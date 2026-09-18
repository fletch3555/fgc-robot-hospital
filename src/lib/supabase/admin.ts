import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY. Uses the service-role key, which bypasses Auth and RLS
 * entirely. Never import this from a `'use client'` file, and never expose
 * `SUPABASE_SERVICE_ROLE_KEY` to the browser.
 *
 * Used only for admin-triggered account management (create/update/delete a
 * user's Supabase Auth identity) via `supabase.auth.admin.*`.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
