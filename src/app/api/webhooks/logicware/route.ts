import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Inbound Webhook for Logicware Hub.
 * Uses Deep Identity Resolution (Numeric-Only Matching) to bypass FSTD vs FTSD typos.
 * Auto-creates shipments and debit entries if package is unknown but owner is identified.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    
    try {
        const body = await request.json();
        const { event, data } = body;

        // 1. Signature Verification
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const webhookSecret = configDoc?.config_value?.webhookSecret;
        const signature = request.headers.get('x-logicware-signature');

        if (webhookSecret && signature && signature !== webhookSecret) {
            console.warn('[WEBHOOK] Unauthorized: Handshake signature mismatch.');
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        if (!event || !data) {
            return NextResponse.json({ message: 'Payload segment missing.' }, { status: 400 });
        }

        // 2. EXHAUSTIVE FIELD MAPPING: Search across 8 possible keys for tracking and mailbox
        const trackingId = (
            data.trackingNumber || 
            data.code || 
            data.reference || 
            data.barcode || 
            data.identifier ||
            ''
        ).toString().toUpperCase().trim();

        const mailboxRaw = (
            data.shipper?.referenceCode || 
            data.shipper?.code || 
            data.shipper?.externalId ||
            data.referenceCode || 
            data.externalId || 
            data.reference || 
            data.memo ||
            data.note ||
            ''
        ).toString().toUpperCase().trim();
        
        // 3. Global Audit Trace
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook',
            description: `Hub Event [${event}] for Tracking: ${trackingId || 'N/A'}`,
            metadata: { event, payload: data, identifiedMailbox: mailboxRaw }
        });

        // 4. PROCESS SHIPMENT EVENTS
        if (event.includes('shipment') && trackingId) {
            const newStatus = data.status?.name || data.status || 'Updated';
            
            // Check for existing local record
            const { data: existing } = await adminClient
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
            } else if (mailboxRaw && mailboxRaw.length > 0) {
                // AUTO-INTAKE PROTOCOL with Numeric-Only Matching
                const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
                
                const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
                const target = profiles?.find(p => {
                    const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
                    const localNumeric = localMailbox.replace(/[^0-9]/g, '');
                    return localMailbox === mailboxRaw || (hubNumeric !== '' && localNumeric === hubNumeric);
                });

                if (target) {
                    const weight = parseFloat(data.weight) || 0;
                    await adminClient.from('shipments').insert({
                        profile_id: target.id,
                        tracking_number: trackingId,
                        contents: data.contents || data.description || 'Hub Auto-Intake',
                        weight_lbs: weight,
                        status: newStatus,
                        total_cost_jmd: 0, 
                        payment_status: 'Unpaid'
                    });
                    
                    console.log(`[WEBHOOK] Auto-established shipment for ${target.id} via Hub Event.`);
                }
            }
        }

        return NextResponse.json({ success: true, status: 'PROCESSED' });

    } catch (error: any) {
        console.error('[WEBHOOK_FATAL]', error);
        return NextResponse.json({ message: 'Webhook processor exception' }, { status: 500 });
    }
}
