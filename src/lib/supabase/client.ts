import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Hardened to prevent crashes during initialization if environment variables are missing or malformed.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Validate URL format to prevent createBrowserClient from throwing
  const isValidUrl = (str: string | undefined): boolean => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  if (!url || !isValidUrl(url) || !key || key.length < 10) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Supabase Client] Credentials missing or invalid during initialization.');
    }
    // Return a client with placeholders to prevent immediate crash.
    // The SupabaseProvider will handle the UI state.
    return createBrowserClient(
      'https://placeholder-project.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}
