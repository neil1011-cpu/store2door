import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements official signature verification and idempotent processing.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    // 1. COLLECT METADATA & HEADERS
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    console.log(`[WEBHOOK:${requestId}] Entry. Sig: ${!!signatureHeader}, Ts: ${timestampHeader}`);

    try {
        const rawBody = await request.text();

        // 2. RETRIEVE CONFIG
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        // 3. SECURE SIGNATURE VERIFICATION
        if (webhookSecret && webhookSecret !== '********') {
            if (!signatureHeader || !timestampHeader) {
                console.error(`[WEBHOOK:${requestId}] Unauthorized: Missing security headers.`);
                return NextResponse.json({ message: 'Unauthorized: Missing security headers' }, { status: 401 });
            }

            const timestamp = parseInt(timestampHeader, 10);
            const now = Math.floor(Date.now() / 1000);
            if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
                console.error(`[WEBHOOK:${requestId}] Unauthorized: Timestamp expired.`);
                return NextResponse.json({ message: 'Unauthorized: Timestamp expired' }, { status: 401 });
            }

            const hmac = createHmac('sha256', webhookSecret);
            const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');
            const expectedSignature = signatureHeader.replace('sha256=', '');

            if (!timingSafeEqual(Buffer.from(calculatedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
                console.error(`[WEBHOOK:${requestId}] Unauthorized: Signature mismatch.`);
                return NextResponse.json({ message: 'Unauthorized: Signature mismatch' }, { status: 401 });
            }
        } else {
            console.warn(`[WEBHOOK:${requestId}] Secret missing in registry. Bypassing verification (Insecure).`);
        }

        // 4. PAYLOAD PROCESSING
        const body = JSON.parse(rawBody);
        const { event, data } = body;
        
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const status = data.status?.name || data.status || 'Updated';
        const logicwareId = data.id || data.packageId;

        if (!trackingId) {
            return NextResponse.json({ message: 'Missing tracking identifier' }, { status: 400 });
        }

        // 5. RESOLVE CUSTOMER IDENTITY
        const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
        const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
        
        const targetProfile = profiles?.find(p => {
            const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
            const localNumeric = localMailbox.replace(/[^0-9]/g, '');
            return localMailbox === mailboxRaw || (hubNumeric !== '' && localNumeric === hubNumeric);
        });

        if (!targetProfile) {
            console.warn(`[WEBHOOK:${requestId}] Mailbox ${mailboxRaw} could not be resolved locally.`);
            await adminClient.from('system_logs').insert({
                log_type: 'webhook_unresolved_mailbox',
                description: `Webhook event ${event} for ${trackingId} skipped. Mailbox ${mailboxRaw} not found.`,
                metadata: { mailboxRaw, trackingId }
            });
            return NextResponse.json({ success: false, message: 'Identity not resolved' });
        }

        // 6. UPSERT SHIPMENT/PRE-ALERT (Idempotent)
        const isPreAlert = status.toLowerCase().includes('pre-alert') || status.toLowerCase().includes('pending');
        
        if (isPreAlert) {
            const { error } = await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: 'Pending',
                logicware_id: logicwareId,
                submission_date: new Date().toISOString()
            }, { onConflict: 'tracking_number' });
            if (error) throw error;
        } else {
            const { error } = await adminClient.from('shipments').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tracking_number' });
            if (error) throw error;
        }

        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Successfully synchronized ${event} for ${trackingId}`,
            actor_id: targetProfile.id,
            metadata: { event, status, weight }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
