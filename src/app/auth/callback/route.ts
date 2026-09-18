import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * @fileOverview Universal Authentication Callback Handler.
 * Exchanges the PKCE 'code' for a secure session and redirects the user.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // The 'next' parameter determines where to go after successful exchange
  const next = searchParams.get('next') ?? '/account'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful exchange: Redirect to the destination (e.g., /account/change-password)
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error('[AUTH CALLBACK ERROR]', error.message)
  }

  // Fallback: If verification fails or code is missing, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
}
