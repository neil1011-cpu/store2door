import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to verify Supabase Admin connectivity.
 * This proves that the SUPABASE_SECRET_KEY is working correctly.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // We attempt a simple operation that would normally require RLS bypass or admin permissions
    // In this case, we'll just check if the client can initialize and perform a simple metadata check
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Supabase Admin client verified successfully',
      privileged_access: true,
      note: 'The secret key is active and authorizing administrative requests.'
    });
  } catch (err: any) {
    console.error('[SUPABASE ADMIN TEST ERROR]', err);
    return NextResponse.json({
      success: false,
      message: 'Supabase Admin initialization failed',
      error: err.message,
      hint: 'Ensure SUPABASE_SECRET_KEY is correctly set in your environment.'
    }, { status: 500 });
  }
}
