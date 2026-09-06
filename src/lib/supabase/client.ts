import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components.
 * Uses a safe fallback if environment variables are missing during boot.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Defensive fallback to prevent "Invalid supabaseUrl" crash during build/init
  const finalUrl = url && url.startsWith('http') ? url : 'https://placeholder.supabase.co';
  const finalKey = key || 'placeholder-key';

  return createBrowserClient(finalUrl, finalKey);
}
