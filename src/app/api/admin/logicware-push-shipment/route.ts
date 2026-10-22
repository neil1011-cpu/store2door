import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API.
 * Optimized for Logicware SDK v0.2.0 with iterative duplicate prevention.
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
        // Use explicit join on profile_id to ensure identity resolution
        const { data: local, error: fetchErr } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(mailbox_number, logicware_id)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (fetchErr || !local) throw new Error('Local record not found in registry.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub not configured.');

        const tracking = local.tracking_number.toUpperCase().trim();
        let logicwareId = local.logicware_id;

        const payload = {
            trackingNumber: tracking,
            weight: parseFloat(local.weight_lbs) || 0,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: local.profiles?.mailbox_number,
            shipperId: local.profiles?.logicware_id,
            status: local.status
        };

        // EXHAUSTIVE SEARCH BEFORE CREATE
        if (!logicwareId) {
            let currentPage = 1;
            let foundMatches: any[] = [];
            const maxPages = 10; 
            const pageSize = 100;
            let hasMore = true;

            while (currentPage <= maxPages && hasMore) {
                const response = await client.packages.list({ 
                    pageSize, 
                    page: currentPage
                });
                
                const list = Array.isArray(response) ? response : (response.data || []);
                
                if (list.length === 0) {
                    hasMore = false;
                    break;
                }

                const matches = list.filter((m: any) => {
                    const remoteTracking = (m.trackingNumber || m.code || '').toString().toUpperCase().trim();
                    return remoteTracking === tracking;
                });
                
                foundMatches.push(...matches);

                if (foundMatches.length > 1) break;
                
                if (list.length < pageSize) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            if (foundMatches.length === 1) {
                logicwareId = foundMatches[0].id;
            } else if (foundMatches.length > 1) {
                throw new Error(`Ambiguity detected: ${foundMatches.length} matching packages found for tracking ${tracking} in Logicware Hub.`);
            } else if (currentPage > maxPages && hasMore) {
                throw new Error(`Search limit reached. Package ${tracking} not found in last 1,000 records. Manual link required.`);
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
            const { error: updateError } = await adminClient
                .from(table)
                .update({ logicware_id: logicwareId })
                .eq('id', shipmentId);
            
            if (updateError) {
                throw new Error(`CRITICAL: Remote Hub ${op} SUCCEEDED, but local registry update failed: ${updateError.message}. Manual ID linking for "${logicwareId}" required.`);
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
