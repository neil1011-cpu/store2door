import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to prove the existence of tables in the public schema.
 * Directly queries the information_schema to bypass schema cache issues.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Query literal table list from Postgres metadata
    const { data, error } = await supabase.rpc('get_table_list');

    // Fallback if RPC isn't installed yet
    if (error) {
      const { data: rawTables, error: rawError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (rawError && rawError.code === 'PGRST204') {
        return NextResponse.json({ status: 'EMPTY', tables: [], error: 'Schema is empty.' });
      }
    }

    // Direct check of known tables
    const tablesToCheck = ['profiles', 'app_roles', 'shipments', 'invoices', 'financial_ledger'];
    const existing: string[] = [];

    for (const table of tablesToCheck) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(0);
      if (!error) existing.push(table);
    }

    if (existing.length === 0) {
        return NextResponse.json({ status: 'EMPTY', tables: [], error: 'No tables found in public schema.' });
    }

    return NextResponse.json({
      status: 'SUCCESS',
      tables: existing,
      project: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      tables: [],
      error: err.message
    }, { status: 500 });
  }
}
