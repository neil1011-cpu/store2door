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
    if (process.env.NODE_ENV === 'production') {
       console.warn('[Supabase Server] Credentials missing during build/prerender.');
    }
  }

  return createServerClient(
    url || 'https://placeholder-project.supabase.co',
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
    const errorMsg = '[Supabase Admin] SUPABASE_SECRET_KEY is missing.';
    if (process.env.NODE_ENV === 'production') {
      console.warn(errorMsg);
    }
  }

  return createServerClient(
    url || 'https://placeholder-project.supabase.co',
    key || 'placeholder-key',
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
