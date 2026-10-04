import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened Universal Inbound Webhook for Logicware Hub.
 * Implements status-based routing: 
 * - Pre-Alert/Pending statuses go to 'pre_alerts' table (Viewing only).
 * - Transit statuses go to 'shipments' table.
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
        
        // Audit Trace
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook',
            description: `Hub Event [${event}] for Tracking: ${trackingId || 'N/A'}`,
            metadata: { event, payload: data, identifiedMailbox: mailboxRaw }
        });

        if (event.includes('shipment') && trackingId) {
            const rawStatus = (data.status?.name || data.status || 'Updated').toString();
            const isPreAlert = rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('pending');
            
            // AUTO-INTAKE PROTOCOL with Numeric-Only Matching
            const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
            const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
            const targetProfile = profiles?.find(p => {
                const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
                const localNumeric = localMailbox.replace(/[^0-9]/g, '');
                return localMailbox === mailboxRaw || (hubNumeric !== '' && localNumeric === hubNumeric);
            });

            if (isPreAlert) {
                // Route to PRE-ALERTS (Viewing Only)
                const { data: existing } = await adminClient.from('pre_alerts').select('id').eq('tracking_number', trackingId).maybeSingle();
                
                if (existing) {
                    await adminClient.from('pre_alerts').update({ status: 'Pending', submission_date: new Date().toISOString() }).eq('id', existing.id);
                } else if (targetProfile) {
                    await adminClient.from('pre_alerts').insert({
                        profile_id: targetProfile.id,
                        tracking_number: trackingId,
                        contents: data.contents || data.description || 'Hub Pre-Alert',
                        weight_lbs: parseFloat(data.weight) || 0,
                        status: 'Pending'
                    });
                }
            } else {
                // Route to SHIPMENTS (Active Transit)
                const { data: existing } = await adminClient.from('shipments').select('id').eq('tracking_number', trackingId).maybeSingle();

                if (existing) {
                    await adminClient.from('shipments').update({ status: rawStatus, updated_at: new Date().toISOString() }).eq('id', existing.id);
                } else if (targetProfile) {
                    await adminClient.from('shipments').insert({
                        profile_id: targetProfile.id,
                        tracking_number: trackingId,
                        contents: data.contents || data.description || 'Hub Shipment',
                        weight_lbs: parseFloat(data.weight) || 0,
                        status: rawStatus,
                        total_cost_jmd: 0, 
                        payment_status: 'Unpaid'
                    });
                }
            }
        }

        return NextResponse.json({ success: true, status: 'PROCESSED' });

    } catch (error: any) {
        console.error('[WEBHOOK_FATAL]', error);
        return NextResponse.json({ message: 'Webhook processor exception' }, { status: 500 });
    }
}
