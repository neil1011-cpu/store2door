import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Uses the official Next.js/Supabase naming convention.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Supabase Client] CRITICAL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(
    url || '',
    key || ''
  );
}
