import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Shipment Sync API.
 * Synchronizes local shipments/pre-alerts with the Logicware Hub.
 * Handles both .create() and .update() using persistent logicware_id mapping.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    let body;

    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid shipment payload' }, { status: 400 });
    }

    const { shipmentId, type = 'shipment' } = body;

    if (!shipmentId) {
        return NextResponse.json({ message: 'Local identifier required.' }, { status: 400 });
    }

    try {
        // 1. Fetch Local Data
        const table = type === 'pre-alert' ? 'pre_alerts' : 'shipments';
        const { data: localRecord, error: fetchErr } = await adminClient
            .from(table)
            .select('*, profiles(mailbox_number)')
            .eq('id', shipmentId)
            .maybeSingle();

        if (fetchErr || !localRecord) throw new Error('Local record not found.');

        // 2. Initialize Logicware Client
        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub not configured.');

        const trackingNumber = localRecord.tracking_number;
        const logicwareId = localRecord.logicware_id;
        
        const payload = {
            trackingNumber: trackingNumber,
            weight: parseFloat(localRecord.weight_lbs) || 0,
            contents: localRecord.contents || 'FSTD Package',
            description: localRecord.contents || '',
            referenceCode: localRecord.profiles?.mailbox_number,
            status: localRecord.status
        };

        let result;
        let operation;

        // 3. EXECUTE SYNC: Update if ID exists, otherwise Create
        if (logicwareId) {
            operation = 'update';
            result = await (client as any).shipments.update(logicwareId, payload);
        } else {
            operation = 'create';
            result = await (client as any).shipments.create(payload);
            
            // Save the Logicware ID back to our registry for future updates
            if (result?.id) {
                await adminClient
                    .from(table)
                    .update({ logicware_id: result.id })
                    .eq('id', shipmentId);
            }
        }

        // 4. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${operation}_success`,
            description: `Shipment ${trackingNumber} synchronized (${operation}) with Logicware Hub.`,
            metadata: { 
                trackingNumber, 
                logicwareId: logicwareId || result?.id,
                localId: shipmentId,
                type 
            }
        });

        return NextResponse.json({ 
            success: true, 
            operation,
            logicwareId: logicwareId || result?.id 
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:PUSH_SHIPMENT] FATAL:', error);
        
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_failed',
            description: `Hub sync failed for local item ${shipmentId}: ${error.message}`,
            metadata: { error: error.message, shipmentId }
        });

        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Hub synchronization encountered an exception.' 
        }, { status: 500 });
    }
}
