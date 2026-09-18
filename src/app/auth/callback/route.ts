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
      // If the session was established via a recovery (password reset) flow,
      // Supabase sets the 'amr' (Authentication Method Reference) or we can 
      // assume that if they reached this from a reset email, they need the reset page.
      
      // Default destinations based on context
      const defaultNext = next || '/account';
      
      // If we are coming from a password reset flow, force the reset password page
      // unless 'next' specifically says otherwise.
      const isRecovery = searchParams.get('type') === 'recovery' || next === '/reset-password';
      const finalDestination = isRecovery ? '/reset-password' : defaultNext;

      return NextResponse.redirect(`${origin}${finalDestination}`)
    }
    
    console.error('[AUTH_CALLBACK] Session exchange failed:', error?.message)
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
  }

  // Fallback for missing code
  console.error('[AUTH_CALLBACK] No authorization code found in URL')
  return NextResponse.redirect(`${origin}/signin?error=link_expired_or_invalid`)
}
