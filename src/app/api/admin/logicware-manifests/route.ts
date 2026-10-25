import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

        if (!client.manifests) {
             return NextResponse.json({ success: true, manifests: [] });
        }
        
        // SDK v0.2.0 uses pageSize for list operations
        const response = await client.manifests.list({ pageSize: 100 });
        const list = Array.isArray(response) ? response : (response.data || []);

        return NextResponse.json({ success: true, manifests: list });

    } catch (err: any) {
        console.error('[API:MANIFESTS] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}