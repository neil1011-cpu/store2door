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

        // SEARCH BEFORE CREATE (Iterative Pagination)
        // We scan the Hub to prevent duplicate package creation if the logicware_id is missing locally.
        if (!logicwareId) {
            let currentPage = 1;
            let foundMatches: any[] = [];
            const maxPages = 10; // Scan up to 1000 most recent records

            while (currentPage <= maxPages) {
                const response = await client.packages.list({ 
                    pageSize: 100, 
                    page: currentPage 
                });
                
                // SDK v0.2.0 returns { data: T[] } or T[]
                const list = Array.isArray(response) ? response : (response.data || []);
                if (list.length === 0) break;

                // Compare tracking numbers using exact equality
                const matches = list.filter((m: any) => {
                    const remoteTracking = (m.trackingNumber || m.code || '').toString();
                    return remoteTracking === tracking;
                });
                
                foundMatches.push(...matches);

                // Stop early if we have multiple matches (ambiguity found)
                if (foundMatches.length > 1) break;
                
                // If this page was the last one, stop
                if (list.length < 100) break;
                
                currentPage++;
            }

            if (foundMatches.length === 1) {
                logicwareId = foundMatches[0].id;
                console.log(`[PUSH] Identified existing package in Hub: ${logicwareId}`);
            } else if (foundMatches.length > 1) {
                throw new Error(`Ambiguity detected: ${foundMatches.length} matching packages found for tracking ${tracking} in Logicware Hub. Aborting to prevent data fragmentation.`);
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
                .update({ 
                    logicware_id: logicwareId, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', shipmentId);
            
            if (updateError) throw new Error(`Remote ${op} succeeded but local registry update failed: ${updateError.message}`);
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
