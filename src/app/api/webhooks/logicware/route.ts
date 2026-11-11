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

        // SIGNATURE VALIDATION: Reject if missing, empty, or masked
        if (!webhookSecret || webhookSecret === '' || webhookSecret === '********') {
            console.error(`[WEBHOOK:${requestId}] Security Failure: Webhook secret is not configured or is masked in registry.`);
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
        const mailboxRaw = (data.shipperAddressCode || data.shipper?.referenceCode || data.referenceCode || '').toString().trim().toUpperCase();
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

        if (profileQueryError) {
            console.error(`[WEBHOOK:${requestId}] Profile lookup failed:`, profileQueryError.message, profileQueryError.code);
            return NextResponse.json({ message: 'Database query failure' }, { status: 500 });
        }

        const targetProfile = profiles?.find(p => p.mailbox_number === mailboxRaw) || profiles?.[0];

        if (!targetProfile) {
            console.warn(`[WEBHOOK:${requestId}] Identity Mismatch: No local profile found for mailbox "${mailboxRaw}" (Tracking: ${trackingId}). Skipping event.`);
            return NextResponse.json({ success: true, message: 'Identity not resolved' });
        }

        // PRIORITY PROTECTION & CONFLICT RESOLUTION
        const [
            { data: existingShipment, error: shipCheckError },
            { data: existingPreAlert, error: alertCheckError }
        ] = await Promise.all([
            adminClient.from('shipments').select('status').eq('tracking_number', trackingId).maybeSingle(),
            adminClient.from('pre_alerts').select('status').eq('tracking_number', trackingId).maybeSingle()
        ]);

        if (shipCheckError || alertCheckError) {
            console.error(`[WEBHOOK:${requestId}] Conflict check failed:`, (shipCheckError || alertCheckError)?.message);
        }

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
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Pre-alert upsert failed:`, upsertErr.message, upsertErr.code, upsertErr.details);
                return NextResponse.json({ message: 'Registry update failure' }, { status: 500 });
            }
        } else {
            const { error: upsertErr } = await adminClient.from('shipments').upsert({
                profile_id: targetProfile.id,
                tracking_number: trackingId,
                contents: data.contents || data.description || 'Hub Update',
                weight_lbs: weight,
                status: status,
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            
            if (upsertErr) {
                console.error(`[WEBHOOK:${requestId}] Shipment upsert failed:`, upsertErr.message, upsertErr.code, upsertErr.details);
                return NextResponse.json({ message: 'Registry update failure' }, { status: 500 });
            }

            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }
        }

        // AUDIT LOG
        const { error: logError } = await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Synchronized ${event} for ${trackingId}. Status: ${status}`,
            actor_id: targetProfile.id,
            metadata: { rawStatus, status, logicwareId, event }
        });

        if (logError) {
            console.error(`[WEBHOOK:${requestId}] Audit logging failed:`, logError.message);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] UNHANDLED FATAL:`, err.message);
        return NextResponse.json({ 
            message: 'Internal Server Error', 
            details: process.env.NODE_ENV === 'development' ? err.message : undefined 
        }, { status: 500 });
    }
}
