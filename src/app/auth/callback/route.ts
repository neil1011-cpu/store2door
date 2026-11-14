import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/utils'

/**
 * @fileOverview Universal PKCE Callback Handler.
 * Exchanges the authorization code for a session and redirects to the password update interface.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = getSiteOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // AUTH_FIX: For recovery flows, explicitly redirect to the unified reset interface.
      return NextResponse.redirect(`${origin}/reset-password`)
    }
    
    console.error('[AUTH_CALLBACK] PKCE session exchange failed:', error?.message)
  }

  // Fallback for missing, invalid, or expired recovery codes.
  return NextResponse.redirect(`${origin}/signin?error=link_expired_or_invalid`)
}
