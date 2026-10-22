import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Ensures authorization and prevents duplicate record creation in the Logistics Hub.
 */

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    
    if (!caller) {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    // Verify Authorization
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin && caller.email !== 'admin@neilussolutions.com') {
        return NextResponse.json({ message: 'Access Denied: Administrative role required' }, { status: 403 });
    }

    const adminClient = await createAdminClient();
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const { shipmentId, type = 'shipment' } = body;
    if (!shipmentId) return NextResponse.json({ message: 'Shipment ID required' }, { status: 400 });

    try {
        // 1. Fetch Local Record
        const table = type === 'pre-alert' ? 'pre_alerts' : 'shipments';
        const { data: local, error: fetchErr } = await adminClient
            .from(table)
            .select('*, profiles(mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (fetchErr || !local) throw new Error('Local record not found in registry.');

        // 2. Init Hub Client
        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number;
        let logicwareId = local.logicware_id;

        const syncPayload = {
            trackingNumber: tracking,
            weight: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'FSTD Package',
            description: local.contents || '',
            referenceCode: local.profiles?.mailbox_number,
            status: local.status
        };

        // 3. IDENTIFY BEFORE CREATE (Deduplication)
        // SDK v0.2.0 uses client.packages
        const hub = (client as any).packages;
        if (!hub) throw new Error('SDK packages resource unavailable.');

        if (!logicwareId) {
            console.log(`[PUSH] Searching Hub for tracking: ${tracking}`);
            const results = await hub.list({ trackingNumber: tracking });
            const matches = Array.isArray(results) ? results : (results.data || results.results || []);
            
            // Client-side exact match check
            const exactMatches = matches.filter((m: any) => (m.trackingNumber || m.code || '').toUpperCase() === tracking.toUpperCase());

            if (exactMatches.length === 1) {
                logicwareId = exactMatches[0].id;
                console.log(`[PUSH] Identified existing Hub record: ${logicwareId}`);
            } else if (exactMatches.length > 1) {
                throw new Error(`Ambiguity error: Multiple packages found in Hub with tracking ${tracking}.`);
            }
        }

        // 4. EXECUTE SYNC
        let result;
        let op;
        if (logicwareId) {
            op = 'update';
            result = await hub.update(logicwareId, syncPayload);
        } else {
            op = 'create';
            result = await hub.create(syncPayload);
            if (result?.id) {
                logicwareId = result.id;
            }
        }

        // 5. PERSIST MAPPING
        if (logicwareId) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', shipmentId);
        }

        // 6. AUDIT
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synchronized (${op}) with Hub.`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, type }
        });

        return NextResponse.json({ success: true, logicwareId, operation: op });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message || 'Synchronization failed' }, { status: 500 });
    }
}
