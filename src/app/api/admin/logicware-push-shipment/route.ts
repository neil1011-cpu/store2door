import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure logic to push local shipments to the Logicware Hub.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { shipment } = body;

        if (!shipment || !shipment.trackingNumber) {
            return NextResponse.json({ message: 'Invalid shipment payload' }, { status: 400 });
        }

        const adminClient = await createAdminClient();
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const apiKey = configDoc?.config_value?.apiKey || process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ message: 'Logicware Hub not configured.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');

        // Create the shipment in the Hub
        await client.shipments.create({
            trackingNumber: shipment.trackingNumber,
            weight: shipment.weight || 0,
            contents: shipment.contents || '',
            description: shipment.contents || '',
            referenceCode: shipment.mailbox, // Link by mailbox number
        });

        return NextResponse.json({ success: true, message: 'Shipment synchronized with Hub.' });

    } catch (error: any) {
        console.error('[API:LOGICWARE:PUSH_SHIPMENT] ERROR:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Hub synchronization failed.' 
        }, { status: 500 });
    }
}
