import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Client-side Supabase factory for FromStore2Door OS.
 * strictly uses NEXT_PUBLIC_ variables for browser compatibility.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase Client] Missing Public Credentials. Browser session may be unavailable.');
  }

  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  );
}
