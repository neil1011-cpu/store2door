import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Shipment Sync API.
 * Synchronizes local shipments/pre-alerts with the Logicware Hub.
 * Uses 'packages' resource for SDK v0.2.0 compatibility.
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
        let logicwareId = localRecord.logicware_id;
        
        const payload = {
            trackingNumber: trackingNumber,
            weight: parseFloat(localRecord.weight_lbs) || 0,
            contents: localRecord.contents || 'FSTD Package',
            description: localRecord.contents || '',
            referenceCode: localRecord.profiles?.mailbox_number,
            status: localRecord.status
        };

        // SDK v0.2.0 uses 'packages'
        const packagesResource = (client as any).packages;
        if (!packagesResource) throw new Error('SDK packages resource unavailable.');

        let result;
        let operation;

        // 3. IDENTIFY BEFORE CREATE (Duplicate Prevention)
        if (!logicwareId) {
            console.log(`[PUSH_SHIPMENT] Searching Hub for existing tracking: ${trackingNumber}`);
            const existing = await packagesResource.list({ trackingNumber: trackingNumber });
            
            // Unwrapping SDK response
            const matches = Array.isArray(existing) ? existing : (existing.data || existing.results || []);
            
            // Client-side verification filter to ensure server-side filtering actually worked
            const exactMatches = matches.filter((m: any) => 
                (m.trackingNumber || m.code || '').toUpperCase() === trackingNumber.toUpperCase()
            );

            if (exactMatches.length === 1) {
                logicwareId = exactMatches[0].id;
                console.log(`[PUSH_SHIPMENT] Match found: ${logicwareId}. Mapping state.`);
                await adminClient.from(table).update({ logicware_id: logicwareId }).eq('id', shipmentId);
            } else if (exactMatches.length > 1) {
                throw new Error(`Ambiguity: Tracking ${trackingNumber} matches ${exactMatches.length} remote packages.`);
            }
        }

        // 4. EXECUTE SYNC
        if (logicwareId) {
            operation = 'update';
            result = await packagesResource.update(logicwareId, payload);
        } else {
            operation = 'create';
            result = await packagesResource.create(payload);
            
            // Atomic state persistence
            if (result?.id) {
                await adminClient
                    .from(table)
                    .update({ logicware_id: result.id })
                    .eq('id', shipmentId);
                logicwareId = result.id;
            }
        }

        // 5. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: `logicware_${operation}_success`,
            description: `Shipment ${trackingNumber} synchronized (${operation}) with Hub.`,
            metadata: { 
                trackingNumber, 
                logicwareId,
                localId: shipmentId,
                type 
            }
        });

        return NextResponse.json({ 
            success: true, 
            operation,
            logicwareId 
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:PUSH_SHIPMENT] FATAL:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Hub synchronization encountered an exception.' 
        }, { status: 500 });
    }
}
