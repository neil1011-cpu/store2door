import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/utils'

/**
 * @fileOverview Universal Authentication Callback Handler.
 * Exchanges the PKCE 'code' for a secure session and redirects the user.
 * Standardized to utilize the hardened origin detection for production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Default to /reset-password for recovery flows, or /account for standard login
  const next = searchParams.get('next') ?? '/account'
  
  // Robust origin detection for production redirects (Firebase App Hosting aware)
  const origin = getSiteOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error('[AUTH CALLBACK ERROR]', error.message)
    return NextResponse.redirect(`${origin}/signin?error=link_expired_or_invalid`)
  }

  // Fallback: If code is missing, redirect home
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
}
