import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const finalUrl = url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co';
  const finalKey = key || 'placeholder-anon-key';

  return createServerClient(
    finalUrl,
    finalKey,
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
            // Server Component cookie set error ignored
          }
        },
      },
    }
  );
}

/**
 * Creates an administrative Supabase client using the Secret Key.
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  const finalUrl = url && url.startsWith('http') ? url : 'https://placeholder-project.supabase.co';
  const finalKey = key || 'placeholder-secret-key';

  return createServerClient(
    finalUrl,
    finalKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
