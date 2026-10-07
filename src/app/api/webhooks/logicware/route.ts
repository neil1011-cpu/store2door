import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @fileOverview Hardened Logicware Inbound Webhook (v4).
 * Matches official knight-dev/connect-sdk-js protocol:
 * - Signature: X-Logicware-Signature (sha256=<hex>)
 * - Timestamp: X-Logicware-Timestamp
 * - Canonical: ${timestamp}.${rawBody}
 * - Tolerance: 300s
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    const start = Date.now();

    // 1. COLLECT METADATA & HEADERS
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    console.log(`[LOGICWARE_WEBHOOK_ENTRY:${requestId}] Request received. Sig: ${!!signatureHeader}, Ts: ${timestampHeader}`);

    try {
        const rawBody = await request.text();

        // 2. RETRIEVE CONFIG
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        // 3. SECURE VERIFICATION (If configured)
        if (webhookSecret && webhookSecret !== '********') {
            console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Verifying against SDK protocol...`);

            if (!signatureHeader || !timestampHeader) {
                console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Missing headers.`);
                return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
                    status: 401,
                    headers: { 
                        'X-Store2Door-Webhook-Version': 'logicware-v4',
                        'X-Store2Door-Diag-Code': 'AUTH_MISSING_HEADERS' 
                    }
                });
            }

            // A. Timestamp Tolerance (SDK default: 300s)
            const timestamp = parseInt(timestampHeader, 10);
            const now = Math.floor(Date.now() / 1000);
            const age = Math.abs(now - timestamp);
            
            console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Timestamp age: ${age}s`);
            if (isNaN(timestamp) || age > 300) {
                console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Timestamp drift too high (${age}s).`);
                return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
                    status: 401,
                    headers: { 
                        'X-Store2Door-Webhook-Version': 'logicware-v4',
                        'X-Store2Door-Diag-Code': 'AUTH_TIMESTAMP_EXPIRED' 
                    }
                });
            }

            // B. Signature Format (sha256=<hex>)
            if (!signatureHeader.startsWith('sha256=')) {
                console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Invalid signature format.`);
                return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
                    status: 401,
                    headers: { 
                        'X-Store2Door-Webhook-Version': 'logicware-v4',
                        'X-Store2Door-Diag-Code': 'AUTH_SIG_FORMAT_INVALID' 
                    }
                });
            }

            // C. HMAC Calculation
            const expectedSignatureHex = signatureHeader.replace('sha256=', '');
            const hmac = createHmac('sha256', webhookSecret);
            const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');

            const sigBuf = Buffer.from(expectedSignatureHex, 'hex');
            const calcBuf = Buffer.from(calculatedSignature, 'hex');

            if (sigBuf.length !== calcBuf.length || !timingSafeEqual(sigBuf, calcBuf)) {
                console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Signature mismatch.`);
                return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
                    status: 401,
                    headers: { 
                        'X-Store2Door-Webhook-Version': 'logicware-v4',
                        'X-Store2Door-Diag-Code': 'AUTH_SIG_MISMATCH' 
                    }
                });
            }
            console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Handshake Approved.`);
        } else {
            console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] No secret in registry. Skipping verification.`);
        }

        // 4. PAYLOAD PROCESSING
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return new NextResponse(JSON.stringify({ message: 'Malformed JSON' }), { status: 400 });
        }

        const { event, data } = body;
        if (!event || !data) {
            return new NextResponse(JSON.stringify({ message: 'Invalid payload segment' }), { status: 400 });
        }

        // IDENTIFICATION (shipperAddressCode / trackingNumber)
        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const status = data.status || 'Updated';
        const description = data.description || data.contents || 'Hub Synchronized';

        console.log(`[LOGICWARE_WEBHOOK_DATA:${requestId}] Processing ${event} for ${trackingId}. Mailbox: ${mailboxRaw}`);

        if (trackingId) {
            // Find Customer by Numeric-Only Match
            const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
            const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
            
            const targetProfile = profiles?.find(p => {
                const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
                const localNumeric = localMailbox.replace(/[^0-9]/g, '');
                return localMailbox === mailboxRaw || (hubNumeric !== '' && localNumeric === hubNumeric);
            });

            if (!targetProfile) {
                await adminClient.from('system_logs').insert({
                    log_type: 'logicware_webhook_unresolved',
                    description: `Unresolved customer mailbox: ${mailboxRaw} for package ${trackingId}`,
                    metadata: { event, trackingId, mailboxRaw }
                });
                return NextResponse.json({ success: false, message: 'Identity missing' }, { status: 200 });
            }

            // ROUTE BY STATUS: Received/InTransit -> Shipments, PreAlert/Pending -> Pre-Alerts
            const isPreAlert = status.toLowerCase().includes('prealert') || status.toLowerCase().includes('pending');

            if (isPreAlert) {
                const { data: existing } = await adminClient.from('pre_alerts').select('id').eq('tracking_number', trackingId).maybeSingle();
                const payload = {
                    profile_id: targetProfile.id,
                    tracking_number: trackingId,
                    contents: description,
                    weight_lbs: weight,
                    status: 'Pending',
                    submission_date: new Date().toISOString()
                };

                if (existing) {
                    await adminClient.from('pre_alerts').update(payload).eq('id', existing.id);
                } else {
                    await adminClient.from('pre_alerts').insert(payload);
                }
            } else {
                const { data: existing } = await adminClient.from('shipments').select('id').eq('tracking_number', trackingId).maybeSingle();
                const payload = {
                    profile_id: targetProfile.id,
                    tracking_number: trackingId,
                    contents: description,
                    weight_lbs: weight,
                    status: status,
                    updated_at: new Date().toISOString()
                };

                if (existing) {
                    await adminClient.from('shipments').update(payload).eq('id', existing.id);
                } else {
                    await adminClient.from('shipments').insert({
                        ...payload,
                        total_cost_jmd: 0,
                        payment_status: 'Unpaid'
                    });
                }
            }

            await adminClient.from('system_logs').insert({
                log_type: 'logicware_webhook_processed',
                description: `Successfully processed ${event} for ${trackingId}`,
                actor_id: targetProfile.id,
                metadata: { event, trackingId, status, weight }
            });
        }

        return NextResponse.json({ success: true, duration: `${Date.now() - start}ms` }, {
            headers: { 'X-Store2Door-Webhook-Version': 'logicware-v4' }
        });

    } catch (error: any) {
        console.error(`[LOGICWARE_WEBHOOK_FATAL:${requestId}]`, error);
        return new NextResponse(JSON.stringify({ message: 'Internal Processor Error' }), {
            status: 500,
            headers: { 'X-Store2Door-Webhook-Version': 'logicware-v4' }
        });
    }
}
