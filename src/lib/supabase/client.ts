import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Standardized on: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error('[Supabase Client] CRITICAL: Missing credentials in browser context.');
  }

  return createBrowserClient(
    url || '',
    key || ''
  );
}
