import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Standardized on: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // During Next.js build/prerendering, environment variables are often missing.
    // We return a client with placeholders to prevent the build from crashing.
    // The SupabaseProvider handles the "Missing Config" UI state at runtime.
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Supabase Client] Credentials missing during build/prerender.');
    }
  }

  return createBrowserClient(
    url || 'https://placeholder-project.supabase.co',
    key || 'placeholder-key'
  );
}
