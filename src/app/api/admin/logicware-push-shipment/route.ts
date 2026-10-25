import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { PackageStatus } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Hardened Logicware Shipment Sync API.
 * Aligned with Logicware Connect SDK v0.2.0 and Hub v2 standard milestones.
 * Implements sequential state machine execution with deep diagnostics.
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
        
        // Hub v2 Standard Milestone Sequence (Strict Union Alignment)
        // Note: ReadyToShip is a required intermediate milestone for some physical transitions.
        const statusSequence: string[] = [
            'PreAlert',
            'ReceivedAtWarehouse',
            'ReadyToShip',
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
            return '';
        };

        // 1. Resolve Hub Identity
        let logicwareId = local.logicware_id;
        let currentHubStatusName = 'PreAlert';

        const res = await client.packages.list({ pageSize: 100 });
        const list = Array.isArray(res) ? res : (res.data || []);
        const match = list.find((m: any) => (m.trackingNumber || m.code || '').toString().toUpperCase().trim() === tracking);
        
        if (match) {
            logicwareId = match.id;
            currentHubStatusName = getStatusName(match) || 'PreAlert';
        }

        // 2. Map local status to Hub Milestone
        const mapToHubStatus = (s2dStatus: string): string => {
            const s = (s2dStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('out for delivery')) return 'OutForDelivery';
            if (s.includes('ready for pickup') || s.includes('ready for pick up')) return 'ReadyForPickup';
            if (s.includes('in transit') || s.includes('transit')) return 'InTransit';
            if (s.includes('received') || s.includes('processing') || s.includes('processed')) return 'ReadyToShip';
            return 'PreAlert';
        };

        const targetHubStatus = mapToHubStatus(local.status);
        const startIndex = findIndex(currentHubStatusName);
        const targetIndex = findIndex(targetHubStatus);

        // 3. Initial Creation
        if (!logicwareId) {
            const result = await client.packages.create({
                trackingNumber: tracking,
                weightLbs: parseFloat(local.weight_lbs) || 0,
                description: local.contents || '',
                shipperAddressCode: local.profiles?.mailbox_number
            });
            logicwareId = result?.id;
        }

        if (!logicwareId) throw new Error("Could not resolve Hub package identity.");

        const transitionAudit: any[] = [];
        let finalStatus = currentHubStatusName;

        // 4. Sequential Execution
        if (targetIndex !== -1 && targetIndex > startIndex) {
            for (let i = startIndex + 1; i <= targetIndex; i++) {
                const stepStatus = statusSequence[i] as PackageStatus;
                
                // Manifest association check
                if (stepStatus === 'InTransit' && local.manifest_id) {
                    const { data: localManifest } = await adminClient
                        .from('manifests')
                        .select('flight_number')
                        .eq('id', local.manifest_id)
                        .single();
                    
                    if (localManifest?.flight_number) {
                        const hubManifestsRes = await client.manifests.list({ pageSize: 100 });
                        const hubManifests = Array.isArray(hubManifestsRes) ? hubManifestsRes : (hubManifestsRes.data || []);
                        const hubManifest = hubManifests.find((m: any) => 
                            (m.code || m.manifestNumber || '').toUpperCase() === localManifest.flight_number.toUpperCase()
                        );
                        if (hubManifest) {
                            await client.manifests.addPackages(hubManifest.id, [logicwareId]);
                        }
                    }
                }

                try {
                    const updatedPkg = await client.packages.update(logicwareId, { 
                        status: stepStatus,
                        weightLbs: parseFloat(local.weight_lbs) || 0
                    });

                    const confirmed = getStatusName(updatedPkg);
                    transitionAudit.push({ step: stepStatus, result: confirmed });

                    if (normalize(confirmed) !== normalize(stepStatus)) {
                        throw new Error(`Hub rejected transition. Sent: ${stepStatus}, Hub result: ${confirmed}`);
                    }
                    finalStatus = stepStatus;
                } catch (err: any) {
                    const diag = {
                        step: stepStatus,
                        error: err.message,
                        status: err.status || err.response?.status,
                        details: err.response?.data || err.details,
                        requestId: err.response?.headers?.['x-request-id']
                    };
                    console.error('[LOGICWARE_SYNC_DIAGNOSTIC]', diag);
                    throw new Error(`Logicware Transition Failed [${stepStatus}]: ${err.message}`);
                }
            }
        }

        if (logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_verified',
            description: `Shipment ${tracking} synced. Final State: ${finalStatus}`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, targetHubStatus, finalStatus, audit: transitionAudit }
        });

        return NextResponse.json({ success: true, logicwareId, finalStatus, audit: transitionAudit });

    } catch (err: any) {
        console.error('[LOGICWARE_PUSH] FATAL:', err.message);
        return NextResponse.json({ message: err.message, status: 'error' }, { status: 500 });
    }
}
