import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { PackageStatus } from '@logicware.app/connect-sdk';
import { mapLogicwareStatus } from '@/lib/utils';

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
            .select('*, profiles:profile_id(*)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (localErr) throw new Error(`Registry query failed: ${localErr.message}`);
        if (!local) throw new Error(`Local record ${shipmentId} not found in ${table}.`);

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        let logicwareId = local.logicware_id;
        let operation = 'verified_existing';

        let shipperId: string | null = null;
        if (local.profiles) {
            const localMailbox = (local.profiles.mailbox_number || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const localEmail = (local.profiles.email || '').trim().toLowerCase();

            if (!localMailbox) {
                throw new Error(`Profile ${local.profiles.email} is missing a mailbox number.`);
            }

            // 1. Search by exact Email
            try {
                const hubShipper = await client.shippers.getByEmail(localEmail);
                if (hubShipper) {
                    const hasAddressMatch = hubShipper.addresses.some(a => 
                        a.isActive && a.addressCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === localMailbox
                    );
                    if (hasAddressMatch) {
                        shipperId = hubShipper.id;
                    }
                }
            } catch (err) {
                // Email not found or Hub error - move to list iteration
            }

            // 2. Search by iterating all shippers (Fallback)
            if (!shipperId) {
                const foundIds: string[] = [];
                let itemsProcessed = 0;
                
                try {
                    const shippersGen = client.shippers.listAll({ pageSize: 100 });
                    for await (const shipperItem of shippersGen) {
                        const hubMailbox = (shipperItem.addressCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        if (hubMailbox === localMailbox) {
                            foundIds.push(shipperItem.id);
                        }
                        
                        itemsProcessed++;
                        if (itemsProcessed >= 5000) break; // Cap at 50 pages * 100
                    }
                } catch (iterErr) {
                    console.warn('[LOGICWARE_PUSH] Hub iteration interrupted:', iterErr);
                }

                if (foundIds.length === 1) {
                    shipperId = foundIds[0];
                } else if (foundIds.length > 1) {
                    throw new Error(`Ambiguous shipper resolution: multiple Hub profiles match mailbox ${localMailbox}`);
                }
            }

            if (!shipperId) {
                throw new Error(`No matching Logicware shipper for mailbox ${localMailbox} on tracking ${tracking}`);
            }
        }

        if (!logicwareId) {
            const res = await client.packages.list({ pageSize: 100 });
            const list = Array.isArray(res) ? res : ((res as any).data || []);
            const hubPackage = list.find((m: any) => 
                (m.trackingNumber || m.code || m.reference || '').toString().toUpperCase().trim() === tracking
            );
            if (hubPackage) {
                logicwareId = hubPackage.id;
            }
        }

        if (!logicwareId) {
            const result = await client.packages.create({
                trackingNumber: tracking,
                weightLbs: parseFloat(local.weight_lbs) || 0,
                description: local.contents || '',
                shipperId: shipperId || undefined
            });
            logicwareId = result?.id;
            operation = 'package_created';
        }

        if (!logicwareId) throw new Error("Logicware Hub identity resolution failed.");

        if (logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        const mapToHubStatus = (localStatus: string): PackageStatus | null => {
            const s = (localStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            // Specific string matches in priority order
            if (s === 'pre alert') return 'PreAlert';
            if (s === 'processing' || s === 'processed') return 'Processing';
            if (s.includes('received')) return 'ReceivedAtWarehouse';
            if (s === 'out for delivery') return 'OutForDelivery';
            if (s === 'delivered' || s === 'picked up') return 'Delivered';
            if (s === 'ready for pickup' || s === 'ready for pick up') return 'ReadyForPickup';
            if (s.includes('transit')) return 'InTransit';
            return null;
        };

        const targetHubStatus = mapToHubStatus(local.status);
        
        if (targetHubStatus) {
            try {
                // 1. Fetch current status from Hub to check for downgrades
                const hubPkg = await client.packages.get(logicwareId);
                const currentHubStatus = hubPkg.status;
                
                // Convert Hub status to local terminology for semantic comparison
                const currentMappedStatus = mapLogicwareStatus(currentHubStatus);
                const isSemanticallyEqual = currentMappedStatus.toLowerCase() === local.status.toLowerCase();

                const HUB_STATUS_ORDER: PackageStatus[] = [
                    'PreAlert', 'ReceivedAtWarehouse', 'Processing', 'ReadyToShip', 
                    'Shipped', 'InTransit', 'AtCustoms', 'AtHeadOffice', 
                    'AtLocalOffice', 'ReadyForPickup', 'OutForDelivery', 'Delivered'
                ];

                const currentIndex = HUB_STATUS_ORDER.indexOf(currentHubStatus);
                const targetIndex = HUB_STATUS_ORDER.indexOf(targetHubStatus);

                const willUpdate = !isSemanticallyEqual && currentIndex !== -1 && targetIndex > currentIndex;

                // Debug: Verify status transition logic
                console.log(`[LOGICWARE_STATUS] Check: Tracking=${tracking}, Local=${local.status}, Target=${targetHubStatus}, Hub=${currentHubStatus}, MappedHub=${currentMappedStatus}, WillUpdate=${willUpdate}`);

                // 2. Only update if the target status is higher in the chain and semantically different
                if (willUpdate) {
                    await client.packages.update(logicwareId, { 
                        status: targetHubStatus
                    });
                    console.log(`[LOGICWARE_STATUS] status update sent for ${tracking}`);
                }
            } catch (updateErr: unknown) {
                const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
                console.error(`[LOGICWARE_PUSH] Hub state transition check failed for ${tracking}: ${msg}`);
            }
        }

        return NextResponse.json({ 
            success: true, 
            operation, 
            logicwareId,
            message: 'Synchronized in Logicware Hub.'
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[LOGICWARE_PUSH] FATAL:', msg);
        return NextResponse.json({ message: msg }, { status: 500 });
    }
}
