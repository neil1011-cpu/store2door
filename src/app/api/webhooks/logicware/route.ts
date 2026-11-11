import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { mapLogicwareStatus, STATUS_PRIORITY } from '@/lib/utils';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements strict identity resolution, protection against out-of-order events, 
 * and ownership locking to prevent misassignment of packages.
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
            console.error(`[WEBHOOK:${requestId}] Malformed JSON received.`);
            return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
        }

        const { data: configDoc, error: configError } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();

        if (configError) {
            console.error(`[WEBHOOK:${requestId}] Config Fetch Error:`, configError.message, configError.code);
        }

        const webhookSecret = configDoc?.config_value?.webhookSecret;

        // SIGNATURE VALIDATION: Reject if missing or masked
        if (!webhookSecret || webhookSecret === '' || webhookSecret === '********') {
            console.error(`[WEBHOOK:${requestId}] Security Failure: Webhook secret not initialized in registry.`);
            return NextResponse.json({ message: 'Unauthorized: Hub security not initialized' }, { status: 401 });
        }

        if (!signatureHeader || !timestampHeader) {
            return NextResponse.json({ message: 'Unauthorized: Missing signature' }, { status: 401 });
        }

        const hmac = createHmac('sha256', webhookSecret);
        const calculatedSignature = hmac.update(`${timestampHeader}.${rawBody}`).digest('hex');
        const expectedSignature = signatureHeader.replace('sha256=', '');
        
        const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');

        if (calculatedBuffer.length !== expectedBuffer.length || !timingSafeEqual(calculatedBuffer, expectedBuffer)) {
            console.error(`[WEBHOOK:${requestId}] Security Failure: Invalid HMAC signature.`);
            return NextResponse.json({ message: 'Unauthorized: Invalid signature' }, { status: 401 });
        }

        const { event, data } = body;
        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload structure' }, { status: 400 });
        }

        // Standardize tracking and mailbox for lookups
        const trackingId = (data.trackingNumber || data.code || '').toString().trim().toUpperCase();
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().trim();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const rawStatus = data.status?.name || data.status || 'Updated';
        const status = mapLogicwareStatus(rawStatus);
        const logicwareId = data.id || data.packageId;

        if (!trackingId) {
            console.warn(`[WEBHOOK:${requestId}] Skipping event: Missing tracking identifier.`);
            return NextResponse.json({ success: true, message: 'Missing tracking' });
        }

        // 1. CONFLICT & OWNERSHIP CHECK: Locate existing local records
        const [
            { data: existingShipment, error: shipCheckError },
            { data: existingPreAlert, error: alertCheckError }
        ] = await Promise.all([
            adminClient.from('shipments').select('profile_id, status').eq('tracking_number', trackingId).maybeSingle(),
            adminClient.from('pre_alerts').select('profile_id, status').eq('tracking_number', trackingId).maybeSingle()
        ]);

        if (shipCheckError || alertCheckError) {
            console.error(`[WEBHOOK:${requestId}] Database lookup error:`, (shipCheckError || alertCheckError));
        }

        // 2. IDENTITY RESOLUTION: Only perform if we don't already have a valid owner
        let targetProfileId = existingShipment?.profile_id || existingPreAlert?.profile_id || null;

        if (!targetProfileId) {
            // Normalize incoming mailbox (strip non-alphanumeric, uppercase)
            const normalizedMailbox = mailboxRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            if (!normalizedMailbox) {
                console.warn(`[WEBHOOK:${requestId}] Identity Resolution Skipped: Empty shipperAddressCode for ${trackingId}.`);
            } else {
                const { data: profiles, error: profileQueryError } = await adminClient
                    .from('profiles')
                    .select('id')
                    .eq('mailbox_number', normalizedMailbox);

                if (profileQueryError) {
                    console.error(`[WEBHOOK:${requestId}] Profile query error:`, profileQueryError);
                }

                if (profiles && profiles.length === 1) {
                    targetProfileId = profiles[0].id;
                } else if (profiles && profiles.length > 1) {
                    console.warn(`[WEBHOOK:${requestId}] Ambiguous Identity: Multiple matches for mailbox ${normalizedMailbox}. Skipping assignment.`);
                } else {
                    console.warn(`[WEBHOOK:${requestId}] Identity Mismatch: No customer found matching mailbox ${normalizedMailbox} (Raw: ${mailboxRaw}) for ${trackingId}.`);
                }
            }
        }

        // If we still have no profile ID, we cannot safely record this event
        if (!targetProfileId) {
            return NextResponse.json({ success: true, message: 'Unresolved owner - event ignored' });
        }

        // 3. PRIORITY PROTECTION: Prevent "downgrading" statuses (e.g., InTransit overwriting ReadyForPickup)
        const currentStatus = existingShipment?.status || existingPreAlert?.status || 'Pending';
        const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
        const newPriority = STATUS_PRIORITY[status] || 0;

        if (currentPriority > newPriority) {
            console.log(`[WEBHOOK:${requestId}] Priority Protection: Ignoring ${status} for ${trackingId} (Current: ${currentStatus})`);
            return NextResponse.json({ success: true, message: 'Priority protection active' });
        }

        // 4. REGISTRY UPDATE
        const isPreAlertEvent = (rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('prealert')) || rawStatus.toLowerCase().includes('pending');
        
        if (isPreAlertEvent && !existingShipment) {
            const { error: upsertErr } = await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfileId,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: 'Pending',
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Pre-alert update failure:`, upsertErr);
                return NextResponse.json({ message: 'Registry update failure' }, { status: 500 });
            }
        } else {
            const { error: upsertErr } = await adminClient.from('shipments').upsert({
                profile_id: targetProfileId,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Shipment update failure:`, upsertErr);
                return NextResponse.json({ message: 'Registry update failure' }, { status: 500 });
            }

            // Cleanup associated pre-alert if it exists
            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }
        }

        // 5. AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Synchronized ${event} for ${trackingId}. Status: ${status}`,
            actor_id: targetProfileId,
            metadata: { rawStatus, status, logicwareId, event, mailboxRaw }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] UNHANDLED FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
