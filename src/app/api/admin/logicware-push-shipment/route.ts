import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { PackageStatus } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Hardened Logicware Shipment Sync API.
 * Aligned with Logicware Connect SDK v0.2.0 and official Hub v2 state machine.
 * Status Sequence: PreAlert -> ReadyToShip -> AtCustoms -> AtHeadOffice -> Delivered
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
        
        // 1. Status sequence and normalization (Aligned with Hub v2 actual labels)
        const statusSequence: PackageStatus[] = [
            'PreAlert',
            'ReadyToShip',
            'AtCustoms',
            'AtHeadOffice',
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
            return '';
        };

        // 2. Identify Hub Package and Current State
        let logicwareId = local.logicware_id;
        let currentHubStatusName = 'PreAlert';

        for (let page = 1; page <= 5; page++) {
            const res = await client.packages.list({ pageSize: 100, page });
            const list = Array.isArray(res) ? res : (res.data || []);
            if (list.length === 0) break;
            const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
            if (match) {
                logicwareId = match.id;
                currentHubStatusName = getStatusName(match) || 'PreAlert';
                break;
            }
        }

        // 3. Target Mapping (Store2Door -> Logicware Hub v2)
        const mapToHubStatus = (s2dStatus: string): PackageStatus => {
            const s = (s2dStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('out for delivery')) return 'AtHeadOffice';
            if (s.includes('ready for pickup') || s.includes('ready for pick up')) return 'AtHeadOffice';
            if (s.includes('in transit') || s.includes('transit')) return 'AtCustoms';
            if (s.includes('received') || s.includes('processing') || s.includes('processed')) return 'ReadyToShip';
            return 'PreAlert';
        };

        const targetHubStatus = mapToHubStatus(local.status);
        const startIndex = findIndex(currentHubStatusName);
        const targetIndex = findIndex(targetHubStatus);

        // 4. Creation / Sync Loop
        if (!logicwareId) {
            const result = await client.packages.create({
                trackingNumber: tracking,
                weightLbs: parseFloat(local.weight_lbs) || 0,
                description: local.contents || '',
                shipperAddressCode: local.profiles?.mailbox_number
            });
            logicwareId = result?.id;
        }

        const transitionAudit: any[] = [];
        let finalStatus = currentHubStatusName;

        // Execute sequential transitions if target is further down the chain
        if (logicwareId && targetIndex !== -1 && targetIndex > startIndex) {
            for (let i = startIndex + 1; i <= targetIndex; i++) {
                const stepStatus = statusSequence[i];
                
                // IMPORTANT: Use generic update with status property for SDK v0.2.0 compatibility
                const updateRes = await client.packages.update(logicwareId, { 
                    status: stepStatus,
                    weightLbs: parseFloat(local.weight_lbs) || 0, // Ensure weight is passed for intake steps
                    description: local.contents || ''
                });

                // Post-update verification
                let confirmed = getStatusName(updateRes);
                
                // Registry re-check to confirm persistence (handles Hub async delays)
                const verifyRes = await client.packages.list({ pageSize: 100 });
                const verifyList = Array.isArray(verifyRes) ? verifyRes : (verifyRes.data || []);
                const verifyMatch = verifyList.find((m: any) => m.id === logicwareId);
                confirmed = getStatusName(verifyMatch) || confirmed;

                transitionAudit.push({ step: stepStatus, result: confirmed });

                if (normalize(confirmed) !== normalize(stepStatus)) {
                    throw new Error(`Transition at step ${stepStatus} failed: Hub rejected change. Currently: ${confirmed}`);
                }
                finalStatus = stepStatus;
            }
        }

        // Persist Hub ID locally
        if (logicwareId && logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_v2',
            description: `Shipment ${tracking} synced. Final Status: ${finalStatus}`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, targetHubStatus, finalStatus, audit: transitionAudit }
        });

        return NextResponse.json({ success: true, logicwareId, finalStatus, audit: transitionAudit });

    } catch (err: any) {
        console.error('[LOGICWARE_PUSH] FATAL:', err.message);
        return NextResponse.json({ message: err.message, status: 'error' }, { status: 500 });
    }
}
