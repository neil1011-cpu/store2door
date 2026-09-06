import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase Client] Missing environment variables. Using placeholders for initialization.');
  }

  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  );
}