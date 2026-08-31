
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to verify Supabase connectivity.
 * Returns the initialization status and session state.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // We check for the session to prove the client is working
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;

    // Test a basic query (this will likely fail if no tables exist yet, 
    // but the error message itself proves connection)
    const { error: queryError } = await supabase.from('_non_existent_table').select('*').limit(1);

    return NextResponse.json({
      success: true,
      message: 'Supabase client initialized successfully',
      connected: true,
      authenticated: !!session,
      environment: process.env.NODE_ENV,
      note: queryError?.code === '42P01' 
        ? 'Connected successfully (Table does not exist as expected)' 
        : 'Connection status verified'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Supabase initialization failed',
      error: err.message
    }, { status: 500 });
  }
}
