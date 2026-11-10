import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
        
        const response = await client.packages.list({ pageSize: 100 });
        const list = Array.isArray(response) ? response : ((response as any).data || []);

        const shipments = list.map((pkg: any) => ({
            ...pkg,
            shipperName: pkg.shipper?.name || pkg.shipper?.referenceCode || pkg.shipper?.code || 'Unknown'
        }));

        return NextResponse.json({ success: true, shipments });

    } catch (err: any) {
        console.error('[API:SHIPMENTS] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
