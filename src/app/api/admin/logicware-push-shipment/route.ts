import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Logicware Shipment Sync API.
 * Implements strict sequential transitions and registry verification.
 * Aligned with Logicware Connect SDK v0.2.0.
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
        
        const { data: local, error: localErr } = await adminClient
            .from(table)
            .select('*, profiles:profile_id(full_name, email, mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (localErr) throw new Error(`Registry query failed: ${localErr.message}`);
        if (!local) throw new Error(`Local record ${shipmentId} not found.`);

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        
        // 1. Status sequence and normalization
        const statusSequence = [
            'PreAlert',
            'ReceivedAtWarehouse',
            'InTransit',
            'ReadyForPickup',
            'OutForDelivery',
            'Delivered'
        ];

        const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]/g, '');
        
        const findIndex = (status: string) => {
            const s = normalize(status);
            return statusSequence.findIndex(item => normalize(item) === s);
        };

        const getStatusName = (res: any): string => {
            if (!res) return '';
            if (typeof res.status === 'string') return res.status;
            if (res.status?.name) return res.status.name;
            if (typeof res === 'string') return res;
            return '';
        };

        // 2. Identify Hub Package and Current State
        let logicwareId = local.logicware_id;
        let currentHubStatusName = 'PreAlert';

        for (let page = 1; page <= 10; page++) {
            const res = await client.packages.list({ pageSize: 100, page });
            const list = Array.isArray(res) ? res : (res.data || []);
            if (list.length === 0) break;
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) {
                logicwareId = match.id;
                currentHubStatusName = getStatusName(match) || 'PreAlert';
                break;
            }
            if (list.length < 100) break;
        }

        const initialHubStatusAtStart = currentHubStatusName;

        // 3. Status Mapping
        const mapToHubStatus = (s2dStatus: string): string => {
            const s = (s2dStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('out for delivery')) return 'OutForDelivery';
            if (s.includes('ready for pickup') || s.includes('ready for pick up')) return 'ReadyForPickup';
            if (s.includes('in transit') || s.includes('transit')) return 'InTransit';
            if (s.includes('processing') || s.includes('processed') || s.includes('received')) return 'ReceivedAtWarehouse';
            return 'PreAlert';
        };

        const targetHubStatus = mapToHubStatus(local.status);
        const startIndex = findIndex(currentHubStatusName);
        const targetIndex = findIndex(targetHubStatus);

        // 4. Execution Loop with Verification
        let finalVerifiedStatus = initialHubStatusAtStart;
        const transitionSteps: string[] = [];
        const verificationAudit: any[] = [];

        if (!logicwareId) {
            const result = await client.packages.create({
                trackingNumber: tracking,
                weightLbs: parseFloat(local.weight_lbs) || 0,
                description: local.contents || '',
                shipperAddressCode: (local as any).profiles?.mailbox_number
            });
            logicwareId = result?.id;
        }

        // Sequential Transitions
        if (logicwareId && targetIndex !== -1 && targetIndex > startIndex) {
            for (let i = startIndex + 1; i <= targetIndex; i++) {
                const stepStatus = statusSequence[i];
                try {
                    // SDK 0.2.0: Use packages.update with status string
                    const updateResult = await client.packages.update(logicwareId, { 
                        status: stepStatus 
                    });
                    
                    let confirmed = getStatusName(updateResult);
                    
                    // Independent registry lookup for confirmation
                    if (normalize(confirmed) !== normalize(stepStatus)) {
                        let registryMatch = null;
                        for (let p = 1; p <= 5; p++) {
                            const vRes = await client.packages.list({ pageSize: 100, page: p });
                            const vList = Array.isArray(vRes) ? vRes : (vRes.data || []);
                            registryMatch = vList.find((m: any) => m.id === logicwareId);
                            if (registryMatch) break;
                        }
                        confirmed = getStatusName(registryMatch) || confirmed;
                    }

                    verificationAudit.push({ step: stepStatus, confirmed });

                    if (normalize(confirmed) !== normalize(stepStatus)) {
                        throw new Error(`Hub rejected transition to ${stepStatus}. Currently: ${confirmed}`);
                    }

                    transitionSteps.push(stepStatus);
                    finalVerifiedStatus = stepStatus;
                } catch (err: any) {
                    throw new Error(`Transition at step ${stepStatus} failed: ${err.message}`);
                }
            }
        } else {
            finalVerifiedStatus = currentHubStatusName;
        }

        // Update local registry with Hub IDs
        if (logicwareId && logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        // Audit Log
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_hardened_sync',
            description: `Shipment ${tracking} sync complete. Confirmed: ${finalVerifiedStatus}.`,
            actor_id: caller.id,
            metadata: { 
                tracking, 
                logicwareId, 
                targetHubStatus, 
                finalVerifiedStatus, 
                transitionSteps,
                verificationAudit
            }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId, 
            finalVerifiedStatus,
            transitionSteps,
            verificationAudit
        });

    } catch (err: any) {
        console.error('[PUSH_SHIPMENT] FATAL:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
