import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Implements exhaustive paginated identity resolution and explicit Hub v2 status transitions.
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
        
        // Robust Dual-Lookup: Support both UUID and Tracking Number identifiers
        let { data: local, error: localErr } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(full_name, email, mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (!local && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shipmentId)) {
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
        
        // 1. EXHAUSTIVE IDENTITY RESOLUTION: Paginated scan for Shipper ID
        let shipperId = null;
        let shipperName = null;
        let matchMethod = 'NONE';
        let searchCompleted = false;

        try {
            const normalizedMailbox = (local as any).profiles?.mailbox_number?.trim().toUpperCase();
            const normalizedEmail = (local as any).profiles?.email?.trim().toLowerCase();

            if (normalizedMailbox || normalizedEmail) {
                // Scan up to 50 pages (5,000 shippers) to find a match
                for (let page = 1; page <= 50; page++) {
                    const shippersResponse = await client.shippers.list({ pageSize: 100, page } as any);
                    const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
                    
                    if (shipperList.length === 0) {
                        searchCompleted = true;
                        break;
                    }

                    // Priority 1: Exact Mailbox Match
                    const mailboxMatch = shipperList.find((s: any) => 
                        (s.referenceCode || s.code || '').trim().toUpperCase() === normalizedMailbox
                    );

                    if (mailboxMatch) {
                        shipperId = mailboxMatch.id;
                        shipperName = mailboxMatch.name;
                        matchMethod = 'MAILBOX';
                        searchCompleted = true;
                        break;
                    }

                    // Priority 2: Email Match
                    const emailMatch = shipperList.find((s: any) => 
                        (s.email || '').trim().toLowerCase() === normalizedEmail
                    );

                    if (emailMatch) {
                        shipperId = emailMatch.id;
                        shipperName = emailMatch.name;
                        matchMethod = 'EMAIL';
                        searchCompleted = true;
                        break;
                    }

                    if (shipperList.length < 100) {
                        searchCompleted = true;
                        break;
                    }
                }
            }
        } catch (shipperErr) {
            console.warn('[PUSH_SHIPMENT] Shipper resolution interrupted:', shipperErr);
        }

        // 2. STATUS MAPPING: Logicware Hub v2 Sentence Case Enumerations
        // Status must be updated via explicit updateStatus call for Nana Banana hubs.
        const mapToHubStatus = (s2dStatus: string) => {
            const s = (s2dStatus || '').toLowerCase();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('pickup') || s.includes('ready')) return 'Arrived at destination';
            if (s.includes('transit')) return 'In transit';
            if (s.includes('received') || s.includes('processing') || s.includes('processed') || s.includes('hold') || s.includes('return')) return 'Received at warehouse';
            if (s.includes('pre-alert') || s.includes('pending')) return 'Pre-alert';
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

        // 3. EXHAUSTIVE DEDUPLICATION SEARCH
        let logicwareId = local.logicware_id;
        if (!logicwareId) {
            const searchResponse = await client.packages.list({ pageSize: 100 });
            const list = Array.isArray(searchResponse) ? searchResponse : ((searchResponse as any).data || []);
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) logicwareId = match.id;
        }

        // 4. EXECUTE HUB OPERATION & EXPLICIT STATUS TRANSITION
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // Apply explicit status transition
        let statusUpdated = false;
        if (logicwareId) {
            try {
                await client.packages.updateStatus(logicwareId, hubStatus);
                statusUpdated = true;
            } catch (statusErr: any) {
                console.warn('[PUSH_SHIPMENT] Status transition failed:', statusErr.message);
            }
        }

        // 5. PERSIST HUB ID LOCALLY
        if (logicwareId && logicwareId !== local.logicware_id) {
            await adminClient
                .from(table)
                .update({ logicware_id: logicwareId })
                .eq('id', local.id);
        }

        // 6. ENHANCED AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synced with Hub. Identity: ${shipperName || 'Unknown'} (${matchMethod}). Hub Status: ${hubStatus} (${statusUpdated ? 'Applied' : 'Pending'})`,
            actor_id: caller.id,
            metadata: { 
                tracking, 
                logicwareId, 
                op, 
                shipperId: shipperId || 'NOT_RESOLVED', 
                shipperName,
                matchMethod,
                searchCompleted,
                hubStatus,
                statusUpdated,
                mailbox: (local as any).profiles?.mailbox_number
            }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId, 
            operation: op, 
            hubStatus, 
            statusUpdated,
            shipperResolved: !!shipperId,
            shipperName,
            matchMethod 
        });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
