import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { mapLogicwareStatus, STATUS_PRIORITY } from '@/lib/utils';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements status normalization, protection against out-of-order events, and length-safe signature validation.
 * Refined for robust error handling and identity resolution.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    try {
        const rawBody = await request.text();
        if (!rawBody) return NextResponse.json({ message: 'Empty body' }, { status: 400 });

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
        }

        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        // SIGNATURE VALIDATION
        if (webhookSecret && webhookSecret !== '********') {
            if (!signatureHeader || !timestampHeader) {
                return NextResponse.json({ message: 'Unauthorized: Missing signature' }, { status: 401 });
            }
            const hmac = createHmac('sha256', webhookSecret);
            const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');
            const expectedSignature = signatureHeader.replace('sha256=', '');
            
            const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');

            if (calculatedBuffer.length !== expectedBuffer.length || !timingSafeEqual(calculatedBuffer, expectedBuffer)) {
                return NextResponse.json({ message: 'Unauthorized: Invalid signature' }, { status: 401 });
            }
        }

        const { event, data } = body;
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload structure' }, { status: 400 });
        }

        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const rawStatus = data.status?.name || data.status || 'Updated';
        const status = mapLogicwareStatus(rawStatus);
        const logicwareId = data.id || data.packageId;

        if (!trackingId) return NextResponse.json({ message: 'Missing tracking identifier' }, { status: 400 });

        // IDENTITY RESOLUTION
        const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
        const { data: profiles, error: profileQueryError } = await adminClient
            .from('profiles')
            .select('id, mailbox_number')
            .or(`mailbox_number.eq.${mailboxRaw},mailbox_number.ilike.%${hubNumeric}`)
            .limit(5);

        if (profileQueryError) throw new Error(`Profile lookup failed: ${profileQueryError.message}`);

        const targetProfile = profiles?.find(p => p.mailbox_number === mailboxRaw) || profiles?.[0];

        if (!targetProfile) {
            await adminClient.from('system_logs').insert({
                log_type: 'webhook_unresolved_mailbox',
                description: `Webhook for ${trackingId} skipped. Mailbox ${mailboxRaw} not found.`,
                metadata: { mailboxRaw, trackingId, event }
            });
            return NextResponse.json({ success: true, message: 'Identity not resolved' });
        }

        // PRIORITY PROTECTION & CONFLICT RESOLUTION
        const [
            { data: existingShipment },
            { data: existingPreAlert }
        ] = await Promise.all([
            adminClient.from('shipments').select('status').eq('tracking_number', trackingId).maybeSingle(),
            adminClient.from('pre_alerts').select('status').eq('tracking_number', trackingId).maybeSingle()
        ]);

        const currentStatus = existingShipment?.status || existingPreAlert?.status || 'Pending';
        const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
        const newPriority = STATUS_PRIORITY[status] || 0;

        if (currentPriority > newPriority) {
            return NextResponse.json({ success: true, message: 'Priority protection active' });
        }

        const isPreAlertEvent = (rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('prealert')) || rawStatus.toLowerCase().includes('pending');
        
        if (isPreAlertEvent && !existingShipment) {
            const { error: upsertErr } = await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: 'Pending',
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            if (upsertErr) throw new Error(`Pre-alert upsert failed: ${upsertErr.message}`);
        } else {
            const { error: upsertErr } = await adminClient.from('shipments').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) throw new Error(`Shipment upsert failed: ${upsertErr.message}`);

            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }
        }

        // AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Synchronized ${event} for ${trackingId}. Status: ${status}`,
            actor_id: targetProfile.id,
            metadata: { rawStatus, status, logicwareId, event }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] FATAL:`, err.message);
        return NextResponse.json({ 
            message: 'Internal Error', 
            details: process.env.NODE_ENV === 'development' ? err.message : undefined 
        }, { status: 500 });
    }
}
