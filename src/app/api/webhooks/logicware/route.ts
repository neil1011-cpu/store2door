import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { mapLogicwareStatus, STATUS_PRIORITY } from '@/lib/utils';
import { getLogicwareClient } from '@/lib/logicware';
import { triggerStatusNotification } from '@/lib/notifications';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements strict identity resolution, protection against out-of-order events, 
 * and data preservation to prevent empty updates from overwriting local records.
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

        // SIGNATURE VALIDATION: Strictly reject if missing or masked
        if (!webhookSecret || webhookSecret === '' || webhookSecret === '********') {
            console.error(`[WEBHOOK:${requestId}] Security Failure: Hub security not initialized in registry.`);
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

        // Standardize tracking for consistent lookups (Case-Insensitive Consistency)
        const trackingId = (data.trackingNumber || data.code || '').toString().trim().toUpperCase();
        const weight = parseFloat(data.weightLbs ?? data.weight ?? 0);
        const rawStatus = data.status?.name || data.status || 'Updated';
        const status = mapLogicwareStatus(rawStatus);
        const logicwareId = data.id || data.packageId;

        if (!trackingId) {
            console.warn(`[WEBHOOK:${requestId}] Skipping event: Missing tracking identifier.`);
            return NextResponse.json({ success: true, message: 'Missing tracking' });
        }

        // 1. OWNER LOCK: Locate existing local records by tracking number
        const [
            { data: existingShipment, error: shipCheckError },
            { data: existingPreAlert, error: alertCheckError }
        ] = await Promise.all([
            adminClient.from('shipments').select('*').eq('tracking_number', trackingId).maybeSingle(),
            adminClient.from('pre_alerts').select('*').eq('tracking_number', trackingId).maybeSingle()
        ]);

        if (shipCheckError) console.error(`[WEBHOOK:${requestId}] Shipments lookup error:`, shipCheckError.message, shipCheckError.code);
        if (alertCheckError) console.error(`[WEBHOOK:${requestId}] Pre-alerts lookup error:`, alertCheckError.message, alertCheckError.code);

        // 2. IDENTITY RESOLUTION: Only perform if we don't already have an established owner
        let targetProfileId: string | null = existingShipment?.profile_id || existingPreAlert?.profile_id || null;
        let mailboxRaw = (data.shipperAddressCode || '').toString().trim();

        if (!mailboxRaw && !targetProfileId) {
            const shipperId = data.shipperId;
            if (!shipperId) {
                console.warn(`[WEBHOOK:${requestId}] Skipping: Missing shipperId and shipperAddressCode for ${trackingId}`);
                return NextResponse.json({ success: true, message: 'Unresolved owner - missing identifiers' });
            }

            try {
                const lwClient = await getLogicwareClient();
                if (lwClient) {
                    const shipper = await lwClient.shippers.get(shipperId);
                    
                    const normalizedCodes = shipper.addresses
                        .filter(a => a.isActive)
                        .map(a => a.addressCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                        .filter(c => c !== '');

                    if (normalizedCodes.length === 0) {
                        console.warn(`[WEBHOOK:${requestId}] Unresolved owner - no address codes for ${trackingId} (Shipper: ${shipperId})`);
                        return NextResponse.json({ success: true, message: 'Unresolved owner - no address codes' });
                    }

                    const { data: apiProfiles, error: apiProfileError } = await adminClient
                        .from('profiles')
                        .select('id')
                        .in('mailbox_number', normalizedCodes);

                    if (apiProfileError) {
                        console.error(`[WEBHOOK:${requestId}] Profile query error:`, apiProfileError.message);
                        return NextResponse.json({ message: 'Registry Failure' }, { status: 500 });
                    }

                    const distinctIds = Array.from(new Set((apiProfiles || []).map(p => p.id)));

                    if (distinctIds.length === 1) {
                        targetProfileId = distinctIds[0];
                    } else {
                        console.warn(`[WEBHOOK:${requestId}] Identity Mismatch: Found ${distinctIds.length} distinct profiles for codes [${normalizedCodes.join(',')}] on ${trackingId}`);
                        return NextResponse.json({ success: true, message: 'Unresolved owner - mismatch' });
                    }
                }
            } catch (lwErr: any) {
                const status = lwErr?.status || lwErr?.response?.status;
                if (status === 404) {
                    console.warn(`[WEBHOOK:${requestId}] Permanent Failure: Shipper ${shipperId} not found for ${trackingId}`);
                    return NextResponse.json({ success: true, message: 'Unresolved owner - shipper not found' });
                }
                console.error(`[WEBHOOK:${requestId}] Hub API Failure: ${lwErr.message}`);
                return NextResponse.json({ message: 'Dependency Lookup Failed' }, { status: 500 });
            }
        }

        const normalizedMailbox = mailboxRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        if (normalizedMailbox && !targetProfileId) {
            const { data: profiles, error: profileQueryError } = await adminClient
                .from('profiles')
                .select('id')
                .eq('mailbox_number', normalizedMailbox);
            
            if (profileQueryError) {
                console.error(`[WEBHOOK:${requestId}] Profile query error:`, profileQueryError.message);
                return NextResponse.json({ message: 'Registry Failure' }, { status: 500 });
            }

            if (profiles && profiles.length === 1) {
                targetProfileId = profiles[0].id;
            } else {
                console.warn(`[WEBHOOK:${requestId}] Identity Mismatch: No unique profile for mailbox ${normalizedMailbox} (${trackingId}). Found: ${profiles?.length || 0}`);
            }
        }

        // Final owner check
        if (!targetProfileId) {
            return NextResponse.json({ success: true, message: 'Unresolved owner - event ignored' });
        }

        // 3. PRIORITY PROTECTION: Prevent "downgrading" statuses
        const currentStatus = existingShipment?.status || existingPreAlert?.status || 'Pending';
        const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
        const newPriority = STATUS_PRIORITY[status] || 0;

        if (currentPriority > newPriority) {
            console.log(`[WEBHOOK:${requestId}] Priority Protection: Ignoring ${status} (Current: ${currentStatus})`);
            return NextResponse.json({ success: true, message: 'Priority protection active' });
        }

        // 4. DATA PRESERVATION: Never overwrite positive weight or valid descriptions with empty values
        const finalWeight = weight > 0 ? weight : (existingShipment?.weight_lbs || existingPreAlert?.weight_lbs || 0);
        const incomingDesc = data.contents || data.description;
        const finalContents = incomingDesc || (existingShipment?.contents || existingPreAlert?.contents || 'Hub Update');

        // 5. REGISTRY UPDATE
        const isPreAlertEvent = (rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('pending'));
        
        if (isPreAlertEvent && !existingShipment) {
            const { error: upsertErr } = await adminClient.from('pre_alerts').upsert({
                profile_id: targetProfileId,
                tracking_number: trackingId,
                contents: finalContents,
                weight_lbs: finalWeight,
                status: 'Pending',
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Pre-alert update failure:`, upsertErr.message, upsertErr.code, upsertErr.details);
                return NextResponse.json({ message: 'Registry write error' }, { status: 500 });
            }
        } else {
            const { error: upsertErr } = await adminClient.from('shipments').upsert({
                profile_id: targetProfileId,
                tracking_number: trackingId,
                contents: finalContents,
                weight_lbs: finalWeight,
                status: status,
                logicware_id: logicwareId,
                logicware_status: rawStatus
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Shipment update failure:`, upsertErr.message, upsertErr.code, upsertErr.details);
                return NextResponse.json({ message: 'Registry write error' }, { status: 500 });
            }

            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }

            // 6. AUTOMATED NOTIFICATIONS: Trigger email on critical status changes
            // Fetches the profile data required for the email template
            const { data: profile } = await adminClient.from('profiles').select('full_name, email').eq('id', targetProfileId).maybeSingle();
            
            if (profile?.email) {
                // Non-blocking trigger: Handled via safe try/catch inside the utility
                triggerStatusNotification({
                    recipientEmail: profile.email,
                    recipientName: profile.full_name,
                    trackingNumber: trackingId,
                    status: status,
                    oldStatus: existingShipment?.status || null
                });
            }
        }

        // 7. AUDIT LOG
        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Sync: ${event} for ${trackingId}. Status: ${status}`,
            actor_id: targetProfileId,
            metadata: { rawStatus, status, logicwareId, event }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] UNHANDLED FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
