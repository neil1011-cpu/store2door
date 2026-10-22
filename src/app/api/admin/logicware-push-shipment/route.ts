import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Ensures authorization and prevents duplicate record creation in the Logistics Hub.
 * Optimized for Logicware SDK v0.2.0.
 */

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    
    if (!caller) {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    // Verify Authorization
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isMaster = caller.email === 'admin@neilussolutions.com';
    
    if (!isAdmin && !isMaster) {
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

        const tracking = local.tracking_number.toUpperCase().trim();
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
        const packagesResource = (client as any).packages;
        if (!packagesResource) throw new Error('SDK packages resource unavailable.');

        if (!logicwareId) {
            console.log(`[PUSH] Searching Hub for tracking: ${tracking}`);
            const response = await packagesResource.list({ pageSize: 50 });
            const list = Array.isArray(response) ? response : (response.data || []);
            
            // Client-side exact match check to prevent partial match collisions
            const exactMatches = list.filter((m: any) => 
                (m.trackingNumber || m.code || '').toUpperCase() === tracking
            );

            if (exactMatches.length === 1) {
                logicwareId = exactMatches[0].id;
                console.log(`[PUSH] Identified existing Hub record: ${logicwareId}`);
            } else if (exactMatches.length > 1) {
                throw new Error(`Ambiguity error: Multiple records found in Hub for tracking ${tracking}. Manual reconciliation required.`);
            }
        }

        // 4. EXECUTE SYNC
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await packagesResource.update(logicwareId, syncPayload);
        } else {
            op = 'create';
            const result = await packagesResource.create(syncPayload);
            if (result?.id) {
                logicwareId = result.id;
            }
        }

        // 5. PERSIST MAPPING (Critical for state integrity)
        if (logicwareId) {
            const { error: saveError } = await adminClient
                .from(table)
                .update({ logicware_id: logicwareId, updated_at: new Date().toISOString() })
                .eq('id', shipmentId);
            
            if (saveError) throw new Error(`Hub sync succeeded but local ID persistence failed: ${saveError.message}`);
        }

        // 6. AUDIT
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synchronized (${op}) with Hub.`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, type, op }
        });

        return NextResponse.json({ success: true, logicwareId, operation: op });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message || 'Synchronization failed' }, { status: 500 });
    }
}
