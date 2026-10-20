import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Standardized Client-side Supabase factory.
 * Hardened to prevent crashes during initialization if environment variables are missing or malformed.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate URL format to prevent createBrowserClient from throwing during SSR
  const isValidUrl = (str: string | undefined): boolean => {
    if (!str) return false;
    try {
      const urlObj = new URL(str);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!url || !isValidUrl(url) || !key || key.length < 10) {
    // Return a client with placeholders to prevent immediate crash during pre-rendering.
    // The SupabaseProvider handles the user-facing "Config Missing" UI.
    return createBrowserClient(
      'https://placeholder-project.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}