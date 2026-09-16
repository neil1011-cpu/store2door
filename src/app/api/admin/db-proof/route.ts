import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to prove the existence of tables in the public schema.
 * Returns the Project URL being used for absolute transparency.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
    const supabase = await createAdminClient();
    
    // Direct check of known tables via literal existence test
    const tablesToCheck = ['profiles', 'app_roles', 'shipments', 'invoices', 'financial_ledger'];
    const existing: string[] = [];

    for (const table of tablesToCheck) {
      // Use a RPC-less check that triggers a PostgREST error if table is missing
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .limit(0);
        
      if (!error) {
        existing.push(table);
      }
    }

    return NextResponse.json({
      status: existing.length > 0 ? 'SUCCESS' : 'EMPTY',
      tables: existing,
      project: url.replace(/(https:\/\/)(.*)(.supabase.co)/, '$1***$3'), // Mask sensitive part
      fullProjectUrl: url // For debugging in this specific turn
    });

  } catch (err: any) {
    console.error('[DB-PROOF ERROR]', err.message);
    return NextResponse.json({
      status: 'ERROR',
      tables: [],
      error: err.message
    }, { status: 500 });
  }
}
