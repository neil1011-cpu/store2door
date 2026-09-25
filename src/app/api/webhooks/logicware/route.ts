
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Inbound Webhook for Logicware Hub updates.
 * Synchronizes external warehouse status changes with the local Supabase registry.
 * Handles auto-intake for new packages if a mailbox number is detected.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    
    try {
        const body = await request.json();
        const { event, data } = body;

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

        // Logicware identifiers can vary by Hub version
        // EXHAUSTIVE DATA MAPPING: Search across all possible Logicware payload keys
        const trackingId = (
            data.trackingNumber || 
            data.code || 
            data.reference || 
            data.barcode || 
            ''
        ).toString().toUpperCase().trim();

        const mailboxCode = (
            data.shipper?.referenceCode || 
            data.shipper?.code || 
            data.referenceCode || 
            data.externalId || 
            data.reference || 
            ''
        ).toString().toUpperCase().trim();
        
        console.log(`[LOGICWARE WEBHOOK] Event: ${event} | Tracking: ${trackingId} | Mailbox: ${mailboxCode}`);

        // 2. Global Audit Trail
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook',
            description: `Hub Event [${event}] received for ${trackingId || 'N/A'}`,
            metadata: { event, payload: data, mailboxResolved: mailboxCode }
        });

        // 3. Process Live Events
        if (event.includes('shipment') && trackingId) {
            const newStatus = data.status?.name || data.status || 'Updated';
            
            // Step A: Check for existing local record
            const { data: existing } = await adminClient
                .from('shipments')
                .select('id')
                .eq('tracking_number', trackingId)
                .maybeSingle();

            if (existing) {
                // Update Status
                await adminClient
                    .from('shipments')
                    .update({ 
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else if (mailboxCode && mailboxCode.length > 0) {
                // Step B: AUTO-INTAKE
                // SMART IDENTITY RESOLVER: Try exact match OR numeric similarity
                const numericMailbox = mailboxCode.replace(/[^0-9]/g, '');
                
                // Fetch all profiles for deep comparison (Safe for MVP registries)
                const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
                const targetProfile = profiles?.find(p => {
                    const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
                    const localNumeric = localMailbox.replace(/[^0-9]/g, '');
                    
                    return localMailbox === mailboxCode || (numericMailbox !== '' && localNumeric === numericMailbox);
                });

                if (targetProfile) {
                    const weight = parseFloat(data.weight) || 0;
                    const { error: intakeError } = await adminClient.from('shipments').insert({
                        profile_id: targetProfile.id,
                        tracking_number: trackingId,
                        contents: data.contents || data.description || data.memo || 'Hub Auto-Intake',
                        weight_lbs: weight,
                        status: newStatus,
                        total_cost_jmd: 0, 
                        payment_status: 'Unpaid'
                    });
                    
                    if (!intakeError) {
                        console.log(`[WEBHOOK] Auto-created shipment for ${targetProfile.id} (${mailboxCode})`);
                    } else {
                        console.error('[WEBHOOK] Auto-intake database failure:', intakeError.message);
                    }
                } else {
                    console.warn(`[WEBHOOK] Auto-intake skipped: Mailbox [${mailboxCode}] not found in Registry.`);
                }
            }
        }

        return NextResponse.json({ success: true, received: true });

    } catch (error: any) {
        console.error('[WEBHOOK FATAL]', error);
        
        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processor_error',
            description: `Webhook execution failure: ${error.message}`,
            metadata: { fatal: true }
        });

        return NextResponse.json({ message: 'Internal Processor Error' }, { status: 500 });
    }
}
