import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Locked to primary production variable names.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Supabase Client] CRITICAL ERROR: Environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in browser context.');
  }

  return createBrowserClient(
    url || '',
    key || ''
  );
}
