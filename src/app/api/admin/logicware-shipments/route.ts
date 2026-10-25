import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Authorized Hub Package Fetcher.
 * Standardized to use 'packages' resource and 'pageSize' for SDK v0.2.0.
 */

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isMaster = user.email === 'admin@neilussolutions.com';

    if (!isAdmin && !isMaster) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = await getLogicwareClient();
        if (!client) throw new Error('Hub configuration missing.');
        
        // Correct resource reference and pagination for v0.2.0
        const response = await client.packages.list({ pageSize: 100 });
        const list = Array.isArray(response) ? response : (response.data || []);

        return NextResponse.json({ success: true, shipments: list });

    } catch (err: any) {
        console.error('[API:SHIPMENTS] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}