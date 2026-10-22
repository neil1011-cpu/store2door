import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Optimized for Logicware SDK v0.2.0 with enhanced duplicate prevention.
 */

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    
    if (!caller) {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isMaster = caller.email === 'admin@neilussolutions.com';
    
    if (!isAdmin && !isMaster) {
        return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
    }

    const adminClient = await createAdminClient();
    const body = await request.json().catch(() => ({}));
    const { shipmentId, type = 'shipment' } = body;

    if (!shipmentId) return NextResponse.json({ message: 'Shipment ID required' }, { status: 400 });

    try {
        const table = type === 'pre-alert' ? 'pre_alerts' : 'shipments';
        const { data: local, error: fetchErr } = await adminClient
            .from(table)
            .select('*, profiles(mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (fetchErr || !local) throw new Error('Local record not found.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub not configured.');

        const tracking = local.tracking_number.toUpperCase().trim();
        let logicwareId = local.logicware_id;

        const payload = {
            trackingNumber: tracking,
            weight: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: local.profiles?.mailbox_number,
            status: local.status
        };

        // SEARCH BEFORE CREATE
        if (!logicwareId) {
            const response = await client.packages.list({ pageSize: 20, trackingNumber: tracking });
            const list = Array.isArray(response) ? response : (response.data || []);
            
            const exactMatches = list.filter((m: any) => 
                (m.trackingNumber || m.code || '').toUpperCase() === tracking
            );

            if (exactMatches.length === 1) {
                logicwareId = exactMatches[0].id;
                console.log(`[PUSH] Matched existing package: ${logicwareId}`);
            } else if (exactMatches.length > 1) {
                throw new Error(`Ambiguity: Multiple packages found for tracking ${tracking}`);
            }
        }

        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        if (logicwareId) {
            await adminClient
                .from(table)
                .update({ logicware_id: logicwareId, updated_at: new Date().toISOString() })
                .eq('id', shipmentId);
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synced with Hub.`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, op }
        });

        return NextResponse.json({ success: true, logicwareId, operation: op });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
