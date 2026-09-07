import { createBrowserClient } from '@supabase/ssr';

/**
 * @fileOverview Client-side Supabase factory for FromStore2Door OS.
 * Uses exhaustive environment variable lookup to handle different naming conventions.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  
  // Exhaustive check for publishable/anon keys
  const key = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase Client] Missing credentials. URL or Public Key is undefined.');
  }

  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  );
}
