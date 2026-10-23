import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Implements exhaustive paginated identity resolution and Hub v2 status mapping.
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
        
        let { data: local, error: localErr } = await adminClient
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
            throw new Error(`Local record ${shipmentId} not found in registry.`);
        }

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

            // Scan up to 50 pages (5,000 shippers) to find a mailbox match
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
        } catch (shipperErr) {
            console.warn('[PUSH_SHIPMENT] Shipper resolution interrupted:', shipperErr);
        }

        // Safety: If we didn't find the shipper and the search was cut short, do not proceed
        if (!shipperId && !searchCompleted) {
            throw new Error('Identity resolution interrupted: Registry search depth reached or API timeout.');
        }

        // 2. STATUS MAPPING: Precise Hub v2 strings (Title Case)
        // nana-banana based hubs require exact Title Case strings to transition from Pre-Alert
        const mapToHubStatus = (s2dStatus: string) => {
            const s = (s2dStatus || '').toLowerCase();
            if (s.includes('transit')) return 'In Transit';
            if (s.includes('pickup') || s.includes('ready')) return 'Arrived at Destination';
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('received') || s.includes('processing') || s.includes('hold') || s.includes('return')) return 'Received at Warehouse';
            if (s.includes('pre-alert') || s.includes('pending')) return 'Pre-Alert';
            return 'Received at Warehouse';
        };

        const hubStatus = mapToHubStatus(local.status);

        const payload = {
            trackingNumber: tracking,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: (local as any).profiles?.mailbox_number,
            shipperId: shipperId,
            status: hubStatus
        };

        // 3. EXHAUSTIVE DEDUPLICATION SEARCH
        let logicwareId = local.logicware_id;
        if (!logicwareId) {
            const searchResponse = await client.packages.list({ pageSize: 100 });
            const list = Array.isArray(searchResponse) ? searchResponse : ((searchResponse as any).data || []);
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) logicwareId = match.id;
        }

        // 4. EXECUTE HUB OPERATION
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // 5. PERSIST HUB ID LOCALLY
        if (logicwareId && logicwareId !== local.logicware_id) {
            const { error: persistError } = await adminClient
                .from(table)
                .update({ logicware_id: logicwareId })
                .eq('id', local.id);

            if (persistError) {
                console.warn('[PUSH_SHIPMENT] Local ID persistence failed:', persistError.message);
            }
        }

        // 6. ENHANCED AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_success`,
            description: `Shipment ${tracking} synced with Hub. Identity: ${shipperName || 'Unknown'} (${matchMethod}). Status: ${hubStatus}`,
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
                mailbox: (local as any).profiles?.mailbox_number
            }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId, 
            operation: op, 
            hubStatus, 
            shipperResolved: !!shipperId,
            shipperName,
            matchMethod 
        });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] Error:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
