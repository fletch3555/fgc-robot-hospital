import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components. Create a new instance per
 * component/call rather than sharing a module-level singleton.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
