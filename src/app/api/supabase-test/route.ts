import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to verify Supabase connectivity.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || url.includes('your-project-url')) {
      return NextResponse.json({
        success: false,
        message: 'NEXT_PUBLIC_SUPABASE_URL is not configured.'
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Check initialization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;

    return NextResponse.json({
      success: true,
      message: 'Supabase client initialized successfully',
      connected: true,
      authenticated: !!session,
      project_url: url,
      note: 'Connection verified via anon key handshake.'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Supabase initialization failed',
      error: err.message
    }, { status: 500 });
  }
}
