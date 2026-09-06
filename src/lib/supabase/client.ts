
import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components.
 * This client is safe for browser use as it uses the Publishable key.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Use a valid dummy URL if missing to prevent "Invalid supabaseUrl" error during boot.
  // The SupabaseProvider component will detect these and show the configuration UI.
  return createBrowserClient(
    url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co',
    key || 'placeholder-anon-key'
  );
}
