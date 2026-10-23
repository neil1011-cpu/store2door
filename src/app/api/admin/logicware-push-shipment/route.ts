import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Shipment Sync API with Strict Sequential Verification.
 * Implements linear transitions and active state verification for Hub v2 compliance.
 * Designed to provide a complete diagnostic audit trail.
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
        
        // 1. Resolve Local Identity
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
        
        // 2. Identity Resolution (Shipper)
        let shipperId = null;
        try {
            const normalizedMailbox = (local as any).profiles?.mailbox_number?.trim().toUpperCase();
            if (normalizedMailbox) {
                // Paginated search for shipper
                for (let page = 1; page <= 10; page++) {
                    const res = await client.shippers.list({ pageSize: 100, page } as any);
                    const list = Array.isArray(res) ? res : ((res as any).data || []);
                    if (list.length === 0) break;
                    const match = list.find((s: any) => (s.referenceCode || s.code || '').trim().toUpperCase() === normalizedMailbox);
                    if (match) {
                        shipperId = match.id;
                        break;
                    }
                    if (list.length < 100) break;
                }
            }
        } catch (e) { console.warn('[PUSH_SHIPMENT] Shipper resolution warning.'); }

        // 3. Current Hub Status Retrieval (Pre-Sync Check)
        let logicwareId = local.logicware_id;
        let currentHubStatusName = 'Pre-alert';

        // Find package and its actual status in Logicware
        for (let page = 1; page <= 10; page++) {
            const res = await client.packages.list({ pageSize: 100, page } as any);
            const list = Array.isArray(res) ? res : ((res as any).data || []);
            if (list.length === 0) break;
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) {
                logicwareId = match.id;
                currentHubStatusName = match.status?.name || match.status || 'Pre-alert';
                break;
            }
            if (list.length < 100) break;
        }

        const initialHubStatusAtStart = currentHubStatusName;

        // 4. Status Mapping
        const mapToHubStatus = (s2dStatus: string): string => {
            const s = (s2dStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('out for delivery')) return 'Out for delivery';
            if (s.includes('ready for pickup') || s.includes('ready for pick up')) return 'Arrived at destination';
            if (s.includes('in transit') || s.includes('transit')) return 'In transit';
            if (s.includes('processing') || s.includes('processed') || s.includes('received')) return 'Received at warehouse';
            return 'Pre-alert';
        };

        const targetHubStatus = mapToHubStatus(local.status);
        const payload: any = {
            trackingNumber: tracking,
            weightLbs: parseFloat(local.weight_lbs) || 0,
            contents: local.contents || 'Package',
            description: local.contents || '',
            referenceCode: (local as any).profiles?.mailbox_number,
            shipperId: shipperId
        };

        // 5. Data Sync (Base Properties)
        let op: 'create' | 'update';
        if (logicwareId) {
            op = 'update';
            await client.packages.update(logicwareId, payload);
        } else {
            op = 'create';
            const result = await client.packages.create(payload);
            logicwareId = result?.id;
        }

        // 6. Sequential Transitions with Active Verification
        const statusSequence = [
            'Pre-alert',
            'Received at warehouse',
            'In transit',
            'Arrived at destination',
            'Out for delivery',
            'Delivered'
        ];

        let statusUpdated = false;
        let statusUpdateError: string | null = null;
        let finalVerifiedStatus = initialHubStatusAtStart;
        const transitionSteps: string[] = [];
        const rawApiResponses: any[] = [];

        const getStatusName = (obj: any) => {
            const val = obj?.status?.name || obj?.status || '';
            return String(val).trim();
        };

        if (logicwareId && targetHubStatus) {
            const startIndex = statusSequence.indexOf(currentHubStatusName);
            const targetIndex = statusSequence.indexOf(targetHubStatus);

            if (startIndex !== -1 && targetIndex !== -1 && targetIndex > startIndex) {
                // Execute linear progression
                for (let i = startIndex + 1; i <= targetIndex; i++) {
                    const stepStatus = statusSequence[i];
                    try {
                        // A. Dispatch Update
                        const updateResult = await client.packages.update(logicwareId, { ...payload, status: stepStatus as any });
                        rawApiResponses.push({ step: stepStatus, response: updateResult });

                        // B. Verification Pass 1: Inspect immediate response
                        let confirmed = getStatusName(updateResult);

                        // C. Verification Pass 2: Active fetch if response is inconclusive
                        if (confirmed !== stepStatus) {
                            // Find the package again to verify the status
                            let verifiedMatch = null;
                            for (let page = 1; page <= 5; page++) {
                                const verifyRes = await client.packages.list({ pageSize: 100, page } as any);
                                const list = Array.isArray(verifyRes) ? verifyRes : ((verifyRes as any).data || []);
                                verifiedMatch = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
                                if (verifiedMatch) break;
                            }
                            if (verifiedMatch) confirmed = getStatusName(verifiedMatch);
                        }

                        // D. Final Assertion for this step
                        if (confirmed !== stepStatus) {
                            throw new Error(`Verification Failure: Requested transition to "${stepStatus}" but Hub state remains "${confirmed}".`);
                        }

                        transitionSteps.push(stepStatus);
                        finalVerifiedStatus = stepStatus;
                        statusUpdated = true;
                    } catch (err: any) {
                        statusUpdateError = err?.message || String(err);
                        break; // STOP: Linear integrity broken
                    }
                }
            } else if (targetHubStatus === currentHubStatusName) {
                statusUpdated = true;
                finalVerifiedStatus = targetHubStatus;
            }
        }

        // 7. Persist Metadata & Audit Log
        if (logicwareId && logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_${op}_verification`,
            description: `Shipment ${tracking} sync attempt. Result: ${finalVerifiedStatus}.`,
            actor_id: caller.id,
            metadata: { 
                tracking, 
                logicwareId, 
                targetHubStatus, 
                initialHubStatus: initialHubStatusAtStart,
                finalVerifiedStatus,
                statusUpdated, 
                statusUpdateError,
                transitionSteps,
                rawApiResponses: rawApiResponses.length > 0 ? rawApiResponses : undefined
            }
        });

        // 8. Return Detailed Report
        if (!statusUpdated && targetHubStatus !== initialHubStatusAtStart) {
            return NextResponse.json({ 
                success: false, 
                message: statusUpdateError || 'Status verification failed.',
                initialHubStatus: initialHubStatusAtStart,
                targetHubStatus,
                finalVerifiedStatus,
                transitionSteps
            }, { status: 422 });
        }

        return NextResponse.json({ 
            success: true, 
            logicwareId, 
            operation: op, 
            initialHubStatus: initialHubStatusAtStart,
            targetHubStatus,
            finalVerifiedStatus,
            statusUpdated,
            transitionSteps
        });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] FATAL:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
