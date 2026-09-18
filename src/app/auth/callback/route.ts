import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/utils'

/**
 * Universal PKCE Callback Handler.
 * Exchanges the code for a session and redirects to the final destination.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const origin = getSiteOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      // Logic for determining next destination
      // If we are in a password reset flow, 'next' is usually provided by the application
      // or we can detect it via context.
      const defaultNext = '/account';
      const finalDestination = next || defaultNext;

      return NextResponse.redirect(`${origin}${finalDestination}`)
    }
    
    console.error('[AUTH_CALLBACK] Session exchange failed:', error?.message)
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
  }

  // Fallback for missing code
  console.error('[AUTH_CALLBACK] No authorization code found in URL')
  return NextResponse.redirect(`${origin}/signin?error=link_expired_or_invalid`)
}