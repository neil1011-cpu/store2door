import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @fileOverview Hardened Logicware Inbound Webhook (v3).
 * Implements:
 * 1. Diagnostic Entry Logging
 * 2. HMAC SHA256 Verification (Timestamp + Raw Body)
 * 3. Robust Identity Matching for shipperAddressCode
 * 4. Correct weightLbs mapping
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    // STEP 1: Diagnostic Entry (No secrets logged)
    console.log(`[LOGICWARE_WEBHOOK_ENTRY:${requestId}] Method: ${request.method}`);
    
    try {
        const rawBody = await request.text();
        const headers = request.headers;
        
        const signature = headers.get('x-logicware-signature');
        const timestamp = headers.get('x-logicware-timestamp');

        console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Headers present - Signature: ${!!signature}, Timestamp: ${!!timestamp}`);

        // STEP 2: Configuration & Authentication
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        if (webhookSecret) {
            if (!signature || !timestamp) {
                console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Missing security headers.`);
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            try {
                const hmac = createHmac('sha256', webhookSecret);
                // Standard Logicware Signature Pattern: timestamp.body
                const expectedSignature = hmac.update(`${timestamp}.${rawBody}`).digest('hex');

                const sigBuf = Buffer.from(signature, 'hex');
                const expBuf = Buffer.from(expectedSignature, 'hex');

                if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
                    console.warn(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] 401: Signature mismatch.`);
                    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
                }
                console.log(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Authentication Passed.`);
            } catch (authErr: any) {
                console.error(`[LOGICWARE_WEBHOOK_AUTH:${requestId}] Verification Error:`, authErr.message);
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
        }

        // STEP 3: Payload Processing
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return NextResponse.json({ message: 'Malformed JSON' }, { status: 400 });
        }

        const { event, data } = body;
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload structure' }, { status: 400 });
        }

        // STEP 4: Identification (shipperAddressCode priority)
        const trackingId = (data.trackingNumber || data.code || '').toString().toUpperCase().trim();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || '').toString().toUpperCase().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const status = data.status || 'Updated';
        const description = data.description || data.contents || 'Hub Synchronized Record';

        console.log(`[LOGICWARE_WEBHOOK_DATA:${requestId}] Event: ${event}, Tracking: ${trackingId}, Mailbox: ${mailboxRaw}`);

        // STEP 5: Database Reconciliation
        if (trackingId) {
            // Find user in registry
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
                    description: `Unresolved customer: ${mailboxRaw} for package ${trackingId}`,
                    metadata: { event, trackingId, mailboxRaw }
                });
                // Return 200 to Logicware to stop retries, but log the mismatch
                return NextResponse.json({ success: false, message: 'Customer not found' });
            }

            const isPreAlert = status.toLowerCase().includes('prealert') || status.toLowerCase().includes('pending');

            if (isPreAlert) {
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

            // Record successful audit
            await adminClient.from('system_logs').insert({
                log_type: 'logicware_webhook_processed',
                description: `Processed ${event} for ${trackingId}`,
                actor_id: targetProfile.id,
                metadata: { event, trackingId, status, weight }
            });
        }

        return NextResponse.json({ 
            success: true, 
            status: 'PROCESSED' 
        }, { 
            headers: { 'X-Store2Door-Webhook-Version': 'logicware-v3' } 
        });

    } catch (error: any) {
        console.error(`[LOGICWARE_WEBHOOK_FATAL:${requestId}]`, error);
        return NextResponse.json({ message: 'Internal Processor Error' }, { status: 500 });
    }
}
