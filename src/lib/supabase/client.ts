import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Client-side Supabase factory.
 * Standardized to prioritize NEXT_PUBLIC variables for browser accessibility.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('placeholder')) {
    console.warn('[Supabase Client] Missing or invalid NEXT_PUBLIC_SUPABASE_URL. Check your .env file.');
  }

  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  );
}
