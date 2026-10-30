
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * @fileOverview Standardized Server-side Supabase factory for Next.js 15.
 * Hardened with explicit types to resolve build-blocking errors.
 */
export async function createClient() {
  const cookieStore = await cookies();
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createServerClient(
    url || 'https://placeholder-project.supabase.co',
    key || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

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
