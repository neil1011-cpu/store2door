import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { mapLogicwareStatus, STATUS_PRIORITY } from '@/lib/utils';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements status normalization, protection against out-of-order events, and length-safe signature validation.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    try {
        const rawBody = await request.text();

        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        if (webhookSecret && webhookSecret !== '********') {
            if (!signatureHeader || !timestampHeader) {
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
            const hmac = createHmac('sha256', webhookSecret);
            const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');
            const expectedSignature = signatureHeader.replace('sha256=', '');
            
            // SECURITY: timingSafeEqual requires buffers of identical length.
            const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');

            if (calculatedBuffer.length !== expectedBuffer.length || !timingSafeEqual(calculatedBuffer, expectedBuffer)) {
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        const { event, data } = body;
        
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const rawStatus = data.status?.name || data.status || 'Updated';
        const status = mapLogicwareStatus(rawStatus);
        const logicwareId = data.id || data.packageId;

        if (!trackingId) return NextResponse.json({ message: 'Missing tracking identifier' }, { status: 400 });

        const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, mailbox_number')
            .or(`mailbox_number.eq.${mailboxRaw},mailbox_number.ilike.%${hubNumeric}`)
            .limit(5);

        const targetProfile = profiles?.find(p => p.mailbox_number === mailboxRaw) || profiles?.[0];

        if (!targetProfile) {
            await adminClient.from('system_logs').insert({
                log_type: 'webhook_unresolved_mailbox',
                description: `Webhook for ${trackingId} skipped. Mailbox ${mailboxRaw} not found.`,
                metadata: { mailboxRaw, trackingId }
            });
            return NextResponse.json({ success: false, message: 'Identity not resolved' });
        }

        const { data: existingShipment } = await adminClient
            .from('shipments')
            .select('status')
            .eq('tracking_number', trackingId)
            .maybeSingle();

        const { data: existingPreAlert } = await adminClient
            .from('pre_alerts')
            .select('status')
            .eq('tracking_number', trackingId)
            .maybeSingle();

        const currentStatus = existingShipment?.status || existingPreAlert?.status || 'Pending';
        const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
        const newPriority = STATUS_PRIORITY[status] || 0;

        if (currentPriority > newPriority) {
            return NextResponse.json({ success: true, message: 'Priority protection' });
        }

        const isPreAlertEvent = rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('pending');
        
        if (isPreAlertEvent && !existingShipment) {
            await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: 'Pending',
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
        } else {
            await adminClient.from('shipments').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });

            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }
        }

        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Synchronized ${event} for ${trackingId}. Status: ${status}`,
            actor_id: targetProfile.id,
            metadata: { rawStatus, status, logicwareId }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
