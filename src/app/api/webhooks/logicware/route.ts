import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements official signature verification and idempotent processing.
 * Enhanced identity resolution and diagnostic logging.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    // 1. COLLECT METADATA & HEADERS
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    console.log(`[WEBHOOK:${requestId}] Entry. Signature: ${!!signatureHeader}, Timestamp: ${timestampHeader}`);

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
                return NextResponse.json({ message: 'Unauthorized: Missing security headers' }, { status: 401 });
            }

            const timestamp = parseInt(timestampHeader, 10);
            const now = Math.floor(Date.now() / 1000);
            if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
                return NextResponse.json({ message: 'Unauthorized: Timestamp expired' }, { status: 401 });
            }

            const hmac = createHmac('sha256', webhookSecret);
            const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');
            const expectedSignature = signatureHeader.replace('sha256=', '');

            try {
                if (!timingSafeEqual(Buffer.from(calculatedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
                    return NextResponse.json({ message: 'Unauthorized: Signature mismatch' }, { status: 401 });
                }
            } catch (e) {
                return NextResponse.json({ message: 'Unauthorized: Security validation failed' }, { status: 401 });
            }
        } else {
            console.warn(`[WEBHOOK:${requestId}] Validation skipped: Webhook secret missing in registry.`);
        }

        // 4. PAYLOAD PROCESSING
        const body = JSON.parse(rawBody);
        const { event, data } = body;
        
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload structure' }, { status: 400 });
        }

        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const status = data.status?.name || data.status || 'Updated';
        const logicwareId = data.id || data.packageId;

        if (!trackingId) {
            console.warn(`[WEBHOOK:${requestId}] Event ${event} received without tracking identifier.`);
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
            console.warn(`[WEBHOOK:${requestId}] Identity resolution failed for Mailbox: ${mailboxRaw}`);
            await adminClient.from('system_logs').insert({
                log_type: 'webhook_unresolved_mailbox',
                description: `Webhook event ${event} for ${trackingId} skipped. Mailbox ${mailboxRaw} not found in local registry.`,
                metadata: { mailboxRaw, trackingId, hubNumeric }
            });
            return NextResponse.json({ success: false, message: 'Identity not resolved' });
        }

        // 6. UPSERT SHIPMENT/PRE-ALERT (Idempotency)
        const isPreAlert = status.toLowerCase().includes('pre-alert') || status.toLowerCase().includes('pending');
        
        if (isPreAlert) {
            const { error } = await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Generated Update',
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
                contents: data.contents || data.description || 'Hub Generated Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tracking_number' });
            if (error) throw error;
        }

        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Successfully synchronized Hub event ${event} for tracking ${trackingId}`,
            actor_id: targetProfile.id,
            metadata: { event, status, weight, logicwareId }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
