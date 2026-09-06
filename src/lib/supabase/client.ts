import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components.
 * Uses a safe fallback if environment variables are missing during boot.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Defensive fallback to prevent "Invalid supabaseUrl" crash
  const finalUrl = url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co';
  const finalKey = key || 'placeholder-anon-key';

  return createBrowserClient(finalUrl, finalKey);
}
