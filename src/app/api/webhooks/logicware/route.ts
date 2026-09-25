import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Inbound Webhook for Logicware Hub updates.
 * Synchronizes external warehouse status changes with the local Supabase registry.
 * Now handles automatic shipment creation if a matching user is identified.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, data } = body;

        const adminClient = await createAdminClient();

        // 1. Webhook Secret Verification
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

        const trackingId = (data.trackingNumber || data.referenceCode || '').toUpperCase();
        const mailboxCode = data.shipper?.referenceCode || data.referenceCode || '';
        
        console.log(`[LOGICWARE WEBHOOK] Event: ${event} | Tracking: ${trackingId} | Mailbox: ${mailboxCode}`);

        // 2. Audit Trail
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook',
            description: `Hub Event [${event}] received for ${trackingId || 'N/A'}`,
            metadata: { event, payload: data }
        });

        // 3. Process Event
        if (event.startsWith('shipment.') && trackingId) {
            const newStatus = data.status?.name || data.status || 'Updated';
            
            // Try to update existing
            const { data: existing, error: findError } = await adminClient
                .from('shipments')
                .select('id')
                .eq('tracking_number', trackingId)
                .maybeSingle();

            if (existing) {
                await adminClient
                    .from('shipments')
                    .update({ 
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else if (mailboxCode && mailboxCode.startsWith('FSTD')) {
                // AUTO-INTAKE: If package is new but we have a mailbox number, link to user
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('id')
                    .eq('mailbox_number', mailboxCode)
                    .maybeSingle();

                if (profile) {
                    const weight = parseFloat(data.weight) || 0;
                    // Note: In production, we'd calculate cost based on weight here if needed
                    await adminClient.from('shipments').insert({
                        profile_id: profile.id,
                        tracking_number: trackingId,
                        contents: data.contents || 'Hub Intake',
                        weight_lbs: weight,
                        status: newStatus,
                        total_cost_jmd: 0, // Set by admin later or based on weight
                        payment_status: 'Unpaid'
                    });
                    
                    console.log(`[WEBHOOK] Auto-created shipment for ${mailboxCode}`);
                }
            }
        }

        return NextResponse.json({ success: true, received: true });

    } catch (error: any) {
        console.error('[WEBHOOK FATAL]', error);
        return NextResponse.json({ message: 'Internal Processor Error' }, { status: 500 });
    }
}
