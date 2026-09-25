import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure logic to push local shipments to the Logicware Hub.
 * Retrieves Hub API keys from the registry and logs detailed audit trails.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    let body;

    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid shipment payload' }, { status: 400 });
    }

    const { shipment } = body;

    if (!shipment || !shipment.trackingNumber) {
        return NextResponse.json({ message: 'Tracking number required.' }, { status: 400 });
    }

    try {
        // 1. Fetch API Key from Registry
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const apiKey = configDoc?.config_value?.apiKey || process.env.LOGICWARE_API_KEY;

        if (!apiKey || apiKey === '********') {
            await adminClient.from('system_logs').insert({
                log_type: 'logicware_push_skipped',
                description: `Hub push skipped for ${shipment.trackingNumber}: Hub API key missing.`,
                metadata: { trackingNumber: shipment.trackingNumber }
            });
            return NextResponse.json({ message: 'Logicware Hub not configured.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');

        // 2. Transmit to Hub
        await client.shipments.create({
            trackingNumber: shipment.trackingNumber,
            weight: parseFloat(shipment.weight) || 0,
            contents: shipment.contents || 'FSTD Package',
            description: shipment.contents || '',
            referenceCode: shipment.mailbox, // Crucial for auto-linking in the Hub
        });

        // 3. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_push_success',
            description: `Shipment ${shipment.trackingNumber} pushed to Logicware Hub.`,
            metadata: { trackingNumber: shipment.trackingNumber, mailbox: shipment.mailbox }
        });

        return NextResponse.json({ success: true, message: 'Shipment synchronized with Hub.' });

    } catch (error: any) {
        console.error('[API:LOGICWARE:PUSH_SHIPMENT] ERROR:', error);
        
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_push_failed',
            description: `Hub sync failed for ${shipment.trackingNumber}: ${error.message}`,
            metadata: { error: error.message, trackingNumber: shipment.trackingNumber }
        });

        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Hub synchronization encountered an exception.' 
        }, { status: 500 });
    }
}
