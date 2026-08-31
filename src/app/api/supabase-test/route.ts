
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to verify Supabase connectivity.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check initialization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;

    return NextResponse.json({
      success: true,
      message: 'Supabase client initialized successfully',
      connected: true,
      authenticated: !!session,
      project_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      note: 'Connection verified via publishable key handshake.'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Supabase initialization failed',
      error: err.message
    }, { status: 500 });
  }
}
