import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * @fileOverview Standardized Server-side Supabase factory for Next.js 15.
 */
export async function createClient() {
  const cookieStore = await cookies();
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // During build time, environment variables might be missing.
    // We log a warning instead of throwing to allow the build to proceed if this is imported.
    if (process.env.NODE_ENV === 'production') {
       console.warn('[Supabase Server] Credentials missing. This is expected during static build phases.');
    }
  }

  return createServerClient(
    url || '',
    key || '',
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
    // CRITICAL: Do not throw during build time.
    const errorMsg = '[Supabase Admin] Missing REQUIRED variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY';
    if (process.env.NODE_ENV === 'production') {
      console.warn(errorMsg);
      // Return a dummy client or handle downstream to prevent build crash
    } else {
      throw new Error(errorMsg);
    }
  }

  return createServerClient(
    url || '',
    key || '',
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
