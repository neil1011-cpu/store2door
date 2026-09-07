import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * @fileOverview Standardized Server-side Supabase factory.
 * Strictly enforced to use standard variable names.
 */
export async function createClient() {
  const cookieStore = await cookies();
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('[Supabase Server] Missing REQUIRED variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(
    url,
    key,
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
            // Safe to ignore in Server Components
          }
        },
      },
    }
  );
}

/**
 * Creates a privileged administrative Supabase client using the Secret Key.
 * Standardized on: SUPABASE_SECRET_KEY
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('[Supabase Admin] Missing REQUIRED variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
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
