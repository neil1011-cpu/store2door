
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { PackageStatus } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Hardened Logicware Package Synchronization API.
 * Ensures packages are successfully created in Logicware Hub with correct shipper linkage.
 * Aligned with SDK v0.2.0 (packages resource).
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
            .select('*, profiles:profile_id(*)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (localErr) throw new Error(`Registry query failed: ${localErr.message}`);
        if (!local) throw new Error(`Local record ${shipmentId} not found.`);

        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub configuration missing.');

        const tracking = local.tracking_number.toUpperCase().trim();
        let logicwareId = local.logicware_id;
        let operation = 'verified_existing';

        // 1. SHIPPER RESOLUTION
        let shipperId = null;
        if (local.profiles) {
            const shRes = await client.shippers.list({ pageSize: 100 });
            const sList = Array.isArray(shRes) ? shRes : ((shRes as any).data || []);
            
            const mailbox = local.profiles.mailbox_number?.trim().toUpperCase();
            const email = local.profiles.email?.trim().toLowerCase();

            const existingShipper = sList.find((s: any) => 
                (mailbox && (s.referenceCode || s.code || '').trim().toUpperCase() === mailbox) ||
                (email && (s.email || '').trim().toLowerCase() === email)
            );

            if (existingShipper) {
                shipperId = existingShipper.id;
            } else {
                try {
                    const newShipper = await client.shippers.create({
                        email: local.profiles.email,
                        name: local.profiles.full_name,
                        trn: local.profiles.trn || '000000000',
                        phone: local.profiles.phone || '',
                        addressCode: local.profiles.mailbox_number
                    });
                    shipperId = newShipper?.id;
                } catch (sErr) {
                    console.warn('[LOGICWARE_PUSH] Shipper creation warning:', sErr);
                }
            }
        }

        // 2. PACKAGE HUB VERIFICATION
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

        // 3. PACKAGE CREATION
        if (!logicwareId) {
            const result = await client.packages.create({
                trackingNumber: tracking,
                weightLbs: parseFloat(local.weight_lbs) || 0,
                description: local.contents || '',
                shipperId: shipperId || undefined,
                shipperAddressCode: local.profiles?.mailbox_number
            });
            logicwareId = result?.id;
            operation = 'package_created';
        }

        if (!logicwareId) throw new Error("Logicware Hub identity resolution failed.");

        if (logicwareId !== local.logicware_id) {
            await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', local.id);
        }

        // 4. STATUS SYNCHRONIZATION
        const mapToHubStatus = (localStatus: string): PackageStatus => {
            const s = (localStatus || '').toLowerCase().replace(/[_-]/g, ' ').trim();
            if (s.includes('delivered')) return 'Delivered';
            if (s.includes('out for delivery')) return 'OutForDelivery';
            if (s.includes('ready for pickup') || s.includes('ready for pick up')) return 'ReadyForPickup';
            if (s.includes('in transit') || s.includes('transit')) return 'InTransit';
            if (s.includes('received') || s.includes('processing') || s.includes('processed')) return 'ReceivedAtWarehouse';
            return 'PreAlert';
        };

        const targetHubStatus = mapToHubStatus(local.status);
        
        if (targetHubStatus !== 'PreAlert') {
            await client.packages.update(logicwareId, { 
                status: targetHubStatus,
                weightLbs: parseFloat(local.weight_lbs) || 0
            });
        }

        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_operation',
            description: `Sync for ${tracking}. Hub ID: ${logicwareId}. Status: ${targetHubStatus}`,
            actor_id: caller.id,
            metadata: { tracking, logicwareId, operation, status: targetHubStatus }
        });

        return NextResponse.json({ 
            success: true, 
            operation, 
            logicwareId,
            statusSync: targetHubStatus,
            message: 'Synchronized in Logicware Hub.'
        });

    } catch (err: any) {
        console.error('[LOGICWARE_PUSH] FATAL:', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
