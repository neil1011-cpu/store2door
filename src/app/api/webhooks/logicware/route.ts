import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Inbound Webhook for Logicware Hub updates.
 * Synchronizes external warehouse status changes with the local Supabase registry.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, data } = body;

        const adminClient = await createAdminClient();

        // 1. Webhook Secret Verification
        // Fetches the saved secret from the system_configs registry
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const webhookSecret = configDoc?.config_value?.webhookSecret;
        const signature = request.headers.get('x-logicware-signature');

        if (webhookSecret && signature && signature !== webhookSecret) {
            console.warn('[WEBHOOK] Unauthorized: Signature mismatch.');
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[LOGICWARE WEBHOOK] Received event: ${event}`, data);

        // 2. Log the event for the Admin Activity Feed
        const trackingId = (data.trackingNumber || data.referenceCode || '').toUpperCase();
        
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook',
            description: `Hub Event [${event}] received for ${trackingId || 'N/A'}`,
            metadata: { event, payload: data }
        });

        // 3. Handle Shipment Updates
        if (event.startsWith('shipment.') && trackingId) {
            const newStatus = data.status?.name || data.status || 'Updated';
            
            const { error: updateError } = await adminClient
                .from('shipments')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('tracking_number', trackingId);

            if (updateError) {
                console.error('[WEBHOOK ERROR] Database update failed:', updateError.message);
            } else {
                console.log(`[WEBHOOK SUCCESS] Synced ${trackingId} to state: ${newStatus}`);
            }
        }

        return NextResponse.json({ success: true, received: true });

    } catch (error: any) {
        console.error('[WEBHOOK FATAL]', error);
        return NextResponse.json({ message: 'Internal Processor Error' }, { status: 500 });
    }
}
