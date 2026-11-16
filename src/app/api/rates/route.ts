import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Public-facing Rates Fetcher.
 * Allows any authenticated user to retrieve the shipping rate registry.
 * Strictly limited to the 'shipping_rates' key to protect secrets.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
        }

        const adminClient = await createAdminClient();
        const { data, error } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'shipping_rates')
            .maybeSingle();
        
        if (error) throw error;

        return NextResponse.json(data?.config_value || null);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown registry error';
        console.error('[API:RATES:GET] FATAL:', msg);
        return NextResponse.json({ message: msg }, { status: 500 });
    }
}