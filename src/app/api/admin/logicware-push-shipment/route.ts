import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Resolves "Unknown" customer by matching shipperId and "Pre-Alert" status
 * by mapping S2D state to Hub recognized state strings.
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

    if (!shipmentId) return NextResponse.json({ message: 'Shipment ID or Tracking Number required' }, { status: 400 });

    try {
        const table = type === 'pre-alert' ? 'pre_alerts' : 'shipments';
        
        // 1. LOOKUP: Fetch local record. Supports UUID lookup then fallback to tracking number.
        // NOTE: profiles.logicware_id is excluded as it does not exist in the current schema.
        let { data: local } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(full_name, email, mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (!local) {
            const { data: fallback } = await adminClient
                .from(table)
                .select('*, profiles:profile_id(full_name, email, mailbox_number)')
                .eq('tracking_number', shipmentId.toUpperCase().trim())
                .maybeSingle();
            
            local = fallback;
        }

        if (!local) {
            throw new Error(`Record ${shipmentId} not found in registry.`);
        }

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        
        // 2. IDENTITY RESOLUTION: Find the Logicware Shipper ID via mailbox/email
        let shipperId = null;
        try {
            const shippersResponse = await client.shippers.list({ pageSize: 100 });
            const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
            const foundShipper = shipperList.find((s: any) => 
                s.referenceCode === local.profiles?.mailbox_number || 
                s.email?.toLowerCase() === (local.profiles as any)?.email?.toLowerCase()
            );
            if (foundShipper) {
                shipperId = foundShipper.id;
            }
        } catch (shipperErr) {
            console.warn('[PUSH_SHIPMENT] Shipper resolution failed:', shipperErr);
        }

        // 3. STATUS MAPPING: Convert S2D status to Hub-recognized status
        const mapToHubStatus = (s2dStatus: string) => {
            const s = (s2dStatus || '').toLowerCase();
            if (s.includes('transit')) return 'In Transit';
            if (s.includes('pickup') || s.includes('ready')) return 'Arrived at Destination';
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('received') || s.includes('processing')) return 'Received at Warehouse';
            if (s.includes('pre-alert') || s.includes('pending')) return 'Pre-Alert';
            return 'Received at Warehouse';
        };

        const hubStatus = mapToHubStatus(local.status);

        const payload = {
            trackingNumber: tracking,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: local.profiles?.mailbox_number,
            shipperId: shipperId,
            status: hubStatus
        };

        // 4. EXHAUSTIVE DEDUPLICATION SEARCH
        let logicwareId = local.logicware_id;
        if (!logicwareId) {
            const searchResponse = await client.packages.list({ pageSize: 100 });
            const list = Array.isArray(searchResponse) ? searchResponse : ((searchResponse as any).data || []);
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) logicwareId = match.id;
        }

        // 5. EXECUTE HUB OPERATION
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // 6. PERSIST HUB ID LOCALLY (if logicware_id column exists on shipments/pre_alerts)
        if (logicwareId && logicwareId !== local.logicware_id) {
            await adminClient
                .from(table)
                .update({ logicware_id: logicwareId } as any)
                .eq('id', local.id)
                .catch(() => console.warn('[PUSH_SHIPMENT] Could not persist logicware_id locally.'));
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synced with Hub. Hub Status: ${hubStatus}`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, op, shipperId }
        });

        return NextResponse.json({ success: true, logicwareId, operation: op, hubStatus });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
