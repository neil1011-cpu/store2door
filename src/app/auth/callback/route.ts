import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * @fileOverview Universal PKCE Callback Handler.
 * Exchanges the authorization code for a session and redirects to the password update interface.
 */
export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // AUTH_FIX: Correctly determine origin from headers to prevent localhost redirection in proxied production environments.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const origin = host ? `${protocol}://${host}` : requestOrigin

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
