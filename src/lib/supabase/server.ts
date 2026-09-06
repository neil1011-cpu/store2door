
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components, Server Actions, or API Routes.
 * This client handles cookie management for SSR authentication.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createServerClient(
    url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co',
    key || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates an administrative Supabase client using the Secret Key.
 * CRITICAL: This must ONLY be used on the server and never exposed to the client.
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  return createServerClient(
    url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co',
    key || 'placeholder-secret-key',
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
