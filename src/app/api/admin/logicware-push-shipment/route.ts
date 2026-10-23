import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Corrected to use 'packages' resource and 'pageSize' for SDK v0.2.0.
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
        
        // 1. DUAL LOOKUP: Try UUID first, then Tracking Number fallback.
        let { data: local, error: fetchErr } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (!local && !fetchErr) {
            const { data: fallback, error: fallbackErr } = await adminClient
                .from(table)
                .select('*, profiles:profile_id(mailbox_number)')
                .eq('tracking_number', shipmentId.toUpperCase().trim())
                .maybeSingle();
            
            local = fallback;
            fetchErr = fallbackErr;
        }

        if (fetchErr) {
            throw new Error(`Registry query failed: ${fetchErr.message}`);
        }

        if (!local) {
            throw new Error(`Record ${shipmentId} not found in registry.`);
        }

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        let logicwareId = local.logicware_id;

        const payload = {
            trackingNumber: tracking,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: local.profiles?.mailbox_number,
            status: local.status
        };

        // 2. EXHAUSTIVE DEDUPLICATION SEARCH
        if (!logicwareId) {
            let currentPage = 1;
            let foundMatches: any[] = [];
            const maxPages = 10; 
            const pageSize = 100;
            let hasMore = true;

            while (currentPage <= maxPages && hasMore) {
                // SDK v0.2.0 uses 'packages' resource and 'pageSize' parameter
                const response = await client.packages.list({ pageSize, page: currentPage });
                const list = Array.isArray(response) ? response : ((response as any).data || []);
                
                if (list.length === 0) {
                    hasMore = false;
                    break;
                }

                const matches = list.filter((m: any) => {
                    const remoteTracking = (m.trackingNumber || m.code || '').toString().toUpperCase().trim();
                    return remoteTracking === tracking;
                });
                
                foundMatches.push(...matches);
                if (foundMatches.length > 0) break;
                
                if (list.length < pageSize) hasMore = false;
                else currentPage++;
            }

            if (foundMatches.length > 0) {
                logicwareId = foundMatches[0].id;
            }
        }

        // 3. EXECUTE HUB OPERATION
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // 4. PERSIST HUB ID LOCALLY
        if (logicwareId && logicwareId !== local.logicware_id) {
            const { error: updateError } = await adminClient
                .from(table)
                .update({ logicware_id: logicwareId })
                .eq('id', local.id);
            
            if (updateError) {
                throw new Error(`CRITICAL: Hub ${op} success, but local registry update failed: ${updateError.message}`);
            }
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
