import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Implements exhaustive identity resolution and explicit Hub v2 status transitions.
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
        
        // 1. Robust Dual-Lookup: Support both UUID and Tracking Number identifiers
        let { data: local, error: localErr } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(full_name, email, mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (!local && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shipmentId)) {
            const { data: fallback } = await adminClient
                .from(table)
                .select('*, profiles:profile_id(full_name, email, mailbox_number)')
                .eq('tracking_number', shipmentId.toUpperCase().trim())
                .maybeSingle();
            
            local = fallback;
        }

        if (localErr) throw new Error(`Registry query failed: ${localErr.message}`);
        if (!local) throw new Error(`Local record ${shipmentId} not found in registry.`);

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        
        // 2. EXHAUSTIVE IDENTITY RESOLUTION: Paginated scan for Shipper ID
        let shipperId = null;
        let shipperName = null;
        let matchMethod = 'NONE';

        try {
            const normalizedMailbox = (local as any).profiles?.mailbox_number?.trim().toUpperCase();
            const normalizedEmail = (local as any).profiles?.email?.trim().toLowerCase();

            if (normalizedMailbox || normalizedEmail) {
                // Scan up to 10 pages (1,000 shippers) to find a match
                for (let page = 1; page <= 10; page++) {
                    const shippersResponse = await client.shippers.list({ pageSize: 100, page } as any);
                    const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
                    
                    if (shipperList.length === 0) break;

                    const match = shipperList.find((s: any) => {
                        const hubMailbox = (s.referenceCode || s.code || '').trim().toUpperCase();
                        const hubEmail = (s.email || '').trim().toLowerCase();
                        return (normalizedMailbox && hubMailbox === normalizedMailbox) || (normalizedEmail && hubEmail === normalizedEmail);
                    });

                    if (match) {
                        shipperId = match.id;
                        shipperName = match.name;
                        matchMethod = normalizedMailbox && (match.referenceCode || match.code)?.trim().toUpperCase() === normalizedMailbox ? 'MAILBOX' : 'EMAIL';
                        break;
                    }
                    if (shipperList.length < 100) break;
                }
            }
        } catch (shipperErr) {
            console.warn('[PUSH_SHIPMENT] Shipper resolution interrupted:', shipperErr);
        }

        // 3. STATUS MAPPING: Logicware Hub v2 Sentence Case Enumerations
        const mapToHubStatus = (s2dStatus: string) => {
            const s = (s2dStatus || '').toLowerCase();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('pickup') || s.includes('ready')) return 'Arrived at destination';
            if (s.includes('transit')) return 'In transit';
            if (s.includes('received') || s.includes('processing') || s.includes('processed') || s.includes('hold') || s.includes('return')) return 'Received at warehouse';
            return 'Pre-alert';
        };

        const hubStatus = mapToHubStatus(local.status);

        const payload = {
            trackingNumber: tracking,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: (local as any).profiles?.mailbox_number,
            shipperId: shipperId
        };

        // 4. EXHAUSTIVE DEDUPLICATION SEARCH
        let logicwareId = local.logicware_id;
        if (!logicwareId) {
            for (let page = 1; page <= 5; page++) {
                const searchResponse = await client.packages.list({ pageSize: 100, page } as any);
                const list = Array.isArray(searchResponse) ? searchResponse : ((searchResponse as any).data || []);
                if (list.length === 0) break;
                const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
                if (match) {
                    logicwareId = match.id;
                    break;
                }
                if (list.length < 100) break;
            }
        }

        // 5. EXECUTE HUB DATA SYNC
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // 6. EXECUTE EXPLICIT STATUS TRANSITION
        let statusUpdated = false;
        let statusUpdateError = null;
        if (logicwareId) {
            try {
                // Nana Banana Hubs require explicit updateStatus method calls for state changes
                await client.packages.updateStatus(logicwareId, hubStatus);
                statusUpdated = true;
            } catch (statusErr: any) {
                statusUpdateError = statusErr.message;
                console.warn('[PUSH_SHIPMENT] Hub status transition rejected:', statusErr.message);
            }
        }

        // 7. PERSIST HUB ID LOCALLY
        if (logicwareId && logicwareId !== local.logicware_id) {
            const { error: updateErr } = await adminClient
                .from(table)
                .update({ logicware_id: logicwareId })
                .eq('id', local.id);
            
            if (updateErr) console.error('[PUSH_SHIPMENT] Local ID update failed:', updateErr.message);
        }

        // 8. AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synced. Identity: ${shipperName || 'Unknown'} (${matchMethod}). Status: ${hubStatus} (${statusUpdated ? 'Success' : 'Failed'})`,
            actor_id: caller.id,
            metadata: { 
                tracking, 
                logicwareId, 
                op, 
                hubStatus, 
                statusUpdated, 
                statusUpdateError,
                matchMethod,
                mailbox: (local as any).profiles?.mailbox_number
            }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId, 
            operation: op, 
            hubStatus, 
            statusUpdated,
            statusUpdateError,
            shipperResolved: !!shipperId 
        });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Sync Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
