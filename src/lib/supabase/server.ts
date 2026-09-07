import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * @fileOverview Server-side Supabase factory for FromStore2Door OS.
 * Implements standard SSR cookie management for Next.js 15.
 */
export async function createClient() {
  const cookieStore = await cookies();
  
  // Use NEXT_PUBLIC for discovery to match browser client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored if called from a Server Component
          }
        },
      },
    }
  );
}

/**
 * Creates an administrative Supabase client using the Secret Key.
 * Used strictly for privileged Auth and DB operations on the server.
 * Bypasses RLS.
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('[Supabase Admin] Missing required environment variables: URL or SECRET_KEY');
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
