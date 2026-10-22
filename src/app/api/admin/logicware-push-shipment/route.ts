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

        // EXHAUSTIVE SEARCH BEFORE CREATE
        // Prevents duplicate package creation if the logicware_id is missing locally.
        if (!logicwareId) {
            let currentPage = 1;
            let foundMatches: any[] = [];
            const maxPages = 10; 
            const pageSize = 100;
            let hasMore = true;

            while (currentPage <= maxPages && hasMore) {
                // FETCH: v0.2.0 supports page and pageSize but not trackingNumber filter
                const response = await client.packages.list({ 
                    pageSize, 
                    page: currentPage
                });
                
                const list = Array.isArray(response) ? response : (response.data || []);
                
                // Termination condition: empty page
                if (list.length === 0) {
                    hasMore = false;
                    break;
                }

                // Strict exact match filtering (Case-insensitive via SDK field normalization)
                const matches = list.filter((m: any) => {
                    const remoteTracking = (m.trackingNumber || m.code || '').toString().toUpperCase().trim();
                    return remoteTracking === tracking;
                });
                
                foundMatches.push(...matches);

                // Early exit if multiple matches found
                if (foundMatches.length > 1) break;
                
                // Termination condition: partial page indicates we've reached the end
                if (list.length < pageSize) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            if (foundMatches.length === 1) {
                logicwareId = foundMatches[0].id;
            } else if (foundMatches.length > 1) {
                throw new Error(`Ambiguity detected: ${foundMatches.length} matching packages found for tracking ${tracking} in Logicware Hub. Aborting to prevent data fragmentation.`);
            } else if (currentPage > maxPages && hasMore) {
                throw new Error(`Exhaustive search limit reached (1,000 records). Package ${tracking} was not found in the most recent history. Please link the ID manually to avoid creating a duplicate.`);
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
            // FIX: Removed 'updated_at' to resolve schema cache mismatch errors
            const { error: updateError } = await adminClient
                .from(table)
                .update({ 
                    logicware_id: logicwareId
                })
                .eq('id', shipmentId);
            
            if (updateError) {
                throw new Error(`CRITICAL: Remote Hub ${op} SUCCEEDED, but local registry update failed: ${updateError.message}. Manual ID linking for ID "${logicwareId}" is required.`);
            }
        } else {
            throw new Error(`Hub ${op} appeared successful but no Logicware ID was returned.`);
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
