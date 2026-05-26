
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Universal Webhook for Logicware Hub updates.
 * Handles incoming status changes for shipments and manifests.
 * 
 * Target URL: https://[domain]/api/webhooks/logicware
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, data } = body;

        if (!event || !data) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[LOGICWARE WEBHOOK] Received event: ${event}`, data);

        // 1. Log the event for the Admin Activity Feed
        await adminDb.collection('system_logs').add({
            type: 'logicware_webhook',
            event: event,
            trackingNumber: data.trackingNumber || data.referenceCode || 'N/A',
            payload: data,
            timestamp: serverTimestamp()
        });

        // 2. Handle Shipment Updates
        if (event.startsWith('shipment.')) {
            const trackingId = (data.trackingNumber || data.referenceCode || '').toUpperCase();
            
            if (trackingId) {
                // Find matching local shipment across all users via Collection Group
                const shipmentSnap = await adminDb.collectionGroup('shipments')
                    .where('trackingNumber', '==', trackingId)
                    .limit(1)
                    .get();

                if (!shipmentSnap.empty) {
                    const shipmentDoc = shipmentSnap.docs[0];
                    const newStatus = data.status?.name || data.status || 'Updated';
                    
                    await shipmentDoc.ref.update({
                        status: newStatus,
                        updatedAt: serverTimestamp(),
                        lastWebhookEvent: event
                    });
                    
                    console.log(`[WEBHOOK SUCCESS] Updated local shipment ${trackingId} to ${newStatus}`);
                }
            }
        }

        return NextResponse.json({ success: true, received: true });

    } catch (error: any) {
        console.error('[WEBHOOK ERROR]', error);
        return NextResponse.json({ message: 'Internal Processor Error' }, { status: 500 });
    }
}
