import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mapLogicwareStatus, STATUS_PRIORITY } from '@/lib/utils';

/**
 * @fileOverview Hardened Logicware Inbound Webhook.
 * Implements status normalization, protection against out-of-order events, and optimized identity resolution.
 * Uses explicit node: prefixed imports for Next.js 15 stability.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const requestId = Math.random().toString(36).slice(2, 9);
    
    const h = request.headers;
    const signatureHeader = h.get('x-logicware-signature') || '';
    const timestampHeader = h.get('x-logicware-timestamp') || '';
    
    console.log(`[WEBHOOK:${requestId}] Entry. Signature: ${!!signatureHeader}, Timestamp: ${timestampHeader}`);

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
        }

        const body = JSON.parse(rawBody);
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

        if (!trackingId) {
            console.warn(`[WEBHOOK:${requestId}] Event ${event} received without tracking identifier.`);
            return NextResponse.json({ message: 'Missing tracking identifier' }, { status: 400 });
        }

        let targetProfile = null;
        const hubNumeric = mailboxRaw.replace(/[^0-9]/g, '');

        const { data: exactMatches } = await adminClient
            .from('profiles')
            .select('id, mailbox_number')
            .eq('mailbox_number', mailboxRaw)
            .limit(1);

        if (exactMatches && exactMatches.length > 0) {
            targetProfile = exactMatches[0];
        } else if (hubNumeric) {
            const { data: possibleMatches } = await adminClient
                .from('profiles')
                .select('id, mailbox_number')
                .ilike('mailbox_number', `%${hubNumeric}`)
                .limit(5);

            const filtered = possibleMatches?.filter(p => 
                (p.mailbox_number || '').replace(/[^0-9]/g, '') === hubNumeric
            );

            if (filtered && filtered.length === 1) {
                targetProfile = filtered[0];
            } else if (filtered && filtered.length > 1) {
                console.warn(`[WEBHOOK:${requestId}] Ambiguous identity for code: ${hubNumeric}`);
                return NextResponse.json({ message: 'Ambiguous identity match' }, { status: 422 });
            }
        }

        if (!targetProfile) {
            console.warn(`[WEBHOOK:${requestId}] Identity resolution failed for Mailbox: ${mailboxRaw}`);
            await adminClient.from('system_logs').insert({
                log_type: 'webhook_unresolved_mailbox',
                description: `Webhook event ${event} for ${trackingId} skipped. Mailbox ${mailboxRaw} not found.`,
                metadata: { mailboxRaw, trackingId }
            });
            return NextResponse.json({ success: false, message: 'Identity not resolved' });
        }

        const isPreAlertEvent = rawStatus.toLowerCase().includes('pre-alert') || rawStatus.toLowerCase().includes('pending');
        
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
            console.log(`[WEBHOOK:${requestId}] Status protection: Skipping update from '${currentStatus}' to '${status}' (Lower Priority).`);
            return NextResponse.json({ success: true, message: 'Status priority protection' });
        }

        if (isPreAlertEvent && !existingShipment) {
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
                logicware_id: logicwareId
            }, { onConflict: 'tracking_number' });
            if (error) throw error;

            if (existingPreAlert) {
                await adminClient.from('pre_alerts').update({ status: 'Processed' }).eq('tracking_number', trackingId);
            }
        }

        await adminClient.from('system_logs').insert({
            log_type: 'webhook_processed',
            description: `Synchronized Hub event ${event} for ${trackingId}. Mapped status: ${status}`,
            actor_id: targetProfile.id,
            metadata: { event, rawStatus, mappedStatus: status, logicwareId }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error(`[WEBHOOK:${requestId}] FATAL:`, err.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
