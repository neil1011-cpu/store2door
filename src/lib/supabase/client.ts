import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Client-side Supabase factory.
 * Standardized to prioritize production keys.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase Client] Missing credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  }

  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  );
}
