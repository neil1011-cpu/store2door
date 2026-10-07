import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @fileOverview Hardened Universal Inbound Webhook for Logicware Hub.
 * Implements:
 * 1. HMAC SHA256 Signature Verification (Fixes 401 errors).
 * 2. Status-based routing for package lifecycle events (e.g., package.received).
 * 3. Robust customer matching using shipperAddressCode and numeric fallbacks.
 * 4. Correct weight mapping for weightLbs field.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    try {
        // We must use the raw text body for reliable HMAC verification
        const rawBody = await request.text();
        const headers = request.headers;
        
        // Retrieve signature and timestamp from headers
        const signature = headers.get('x-logicware-signature');
        const timestamp = headers.get('x-logicware-timestamp');

        // 1. Fetch Configuration from Secure Registry
        const { data: configDoc, error: configError } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        if (configError) {
            console.error(`[WEBHOOK_ERROR:${requestId}] Registry lookup failure:`, configError);
            return NextResponse.json({ message: 'Internal Registry Error' }, { status: 500 });
        }

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        // 2. Authentication Protocol (HMAC SHA256)
        if (webhookSecret) {
            if (!signature || !timestamp) {
                console.warn(`[WEBHOOK_AUTH:${requestId}] Handshake rejected: Missing auth headers.`);
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            try {
                const hmac = createHmac('sha256', webhookSecret);
                const expectedSignature = hmac.update(`${timestamp}.${rawBody}`).digest('hex');

                const sigBuf = Buffer.from(signature, 'hex');
                const expBuf = Buffer.from(expectedSignature, 'hex');

                // Constant-time comparison to prevent timing attacks
                if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
                    console.warn(`[WEBHOOK_AUTH:${requestId}] Handshake rejected: Signature mismatch.`);
                    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
                }
            } catch (authErr: any) {
                console.error(`[WEBHOOK_AUTH:${requestId}] Verification exception:`, authErr.message);
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
        } else {
            console.warn(`[WEBHOOK_AUTH:${requestId}] Webhook secret not configured in registry. Authentication bypassed.`);
        }

        // 3. Payload Normalization
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return NextResponse.json({ message: 'Malformed JSON payload' }, { status: 400 });
        }

        const { event, data } = body;
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload structure: missing event or data' }, { status: 400 });
        }

        // 4. Data Extraction (Logicware Payload Mapping)
        const trackingId = (
            data.trackingNumber || 
            data.code || 
            data.reference || 
            data.barcode || 
            ''
        ).toString().toUpperCase().trim();

        // Robust Mailbox Resolution
        const mailboxRaw = (
            data.shipperAddressCode ||
            data.shipper?.referenceCode || 
            data.shipper?.code || 
            data.shipper?.externalId ||
            data.referenceCode || 
            ''
        ).toString().toUpperCase().trim();

        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const status = data.status || 'Updated';
        const description = data.description || data.contents || 'Hub Synchronized Record';

        // 5. Audit Trace (Observe incoming events in /admin/logs)
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook_received',
            description: `Hub Event [${event}] for Package: ${trackingId || 'N/A'}`,
            metadata: { 
                event, 
                packageId: data.packageId,
                trackingId, 
                mailbox: mailboxRaw,
                weight,
                status,
                internalBarcode: data.internalBarcode
            }
        });

        // 6. Supported Event Handling (package.received, shipment.updated, etc.)
        const isLogisticsEvent = /package|shipment|parcel|receipt/i.test(event);

        if (isLogisticsEvent && trackingId) {
            const isPreAlert = status.toLowerCase().includes('pre-alert') || status.toLowerCase().includes('pending');
            
            // Identity Registry Resolution (Numeric-Only Fuzzy Matching)
            const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');
            const { data: profiles } = await adminClient.from('profiles').select('id, mailbox_number');
            
            const targetProfile = profiles?.find(p => {
                const localMailbox = (p.mailbox_number || '').toUpperCase().trim();
                const localNumeric = localMailbox.replace(/[^0-9]/g, '');
                // Match exact code OR numeric-only segments (e.g. FSJ-64471 matches 64471)
                return localMailbox === mailboxRaw || (hubNumeric !== '' && localNumeric === hubNumeric);
            });

            if (!targetProfile) {
                await adminClient.from('system_logs').insert({
                    log_type: 'logicware_webhook_unresolved',
                    description: `Event [${event}] skipped: Identifier "${mailboxRaw}" not found in local registry.`,
                    metadata: { trackingId, mailboxRaw, packageId: data.packageId, status }
                });
                // Return 200 to acknowledge receipt but log the mismatch
                return NextResponse.json({ success: false, message: 'Unresolved customer identifier' });
            }

            if (isPreAlert) {
                // Route to PRE-ALERTS (Viewing Hub)
                const { data: existing } = await adminClient.from('pre_alerts').select('id').eq('tracking_number', trackingId).maybeSingle();
                
                const alertPayload = {
                    profile_id: targetProfile.id,
                    tracking_number: trackingId,
                    contents: description,
                    weight_lbs: weight,
                    status: 'Pending',
                    submission_date: new Date().toISOString()
                };

                if (existing) {
                    await adminClient.from('pre_alerts').update(alertPayload).eq('id', existing.id);
                } else {
                    await adminClient.from('pre_alerts').insert(alertPayload);
                }
            } else {
                // Route to SHIPMENTS (Active Ledger)
                const { data: existing } = await adminClient.from('shipments').select('id').eq('tracking_number', trackingId).maybeSingle();

                const shipmentPayload = {
                    profile_id: targetProfile.id,
                    tracking_number: trackingId,
                    contents: description,
                    weight_lbs: weight,
                    status: status,
                    updated_at: new Date().toISOString()
                };

                if (existing) {
                    await adminClient.from('shipments').update(shipmentPayload).eq('id', existing.id);
                } else {
                    await adminClient.from('shipments').insert({
                        ...shipmentPayload,
                        total_cost_jmd: 0, 
                        payment_status: 'Unpaid'
                    });
                }
            }
        }

        return NextResponse.json({ success: true, status: 'PROCESSED' });

    } catch (error: any) {
        console.error(`[WEBHOOK_FATAL:${requestId}]`, error);
        
        // Log the crash for admin visibility in the dashboard
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_webhook_error',
            description: `Webhook execution crash: ${error.message}`,
            metadata: { error: error.message, requestId }
        });

        return NextResponse.json({ message: 'Processor Exception', error: error.message }, { status: 500 });
    }
}
