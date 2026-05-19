
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Fetches live shipments from the Logicware portal.
 * Centralized: Automatically pulls API key from Firestore if not provided.
 */

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        let apiKey = payload.apiKey;

        // 1. Fallback to System Settings if key not in request
        if (!apiKey) {
            const configSnap = await adminDb.doc('metadata/logicware').get();
            apiKey = configSnap.data()?.apiKey;
        }

        if (!apiKey) {
            return NextResponse.json({ message: 'Logicware Integration not configured.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // 2. Fetch ALL recent shipments from Logicware to ensure mapping works
        const shipments = await client.shipments.list({
            limit: 100,
            sort: 'desc'
        });

        return NextResponse.json({ 
            success: true, 
            shipments: shipments.map((s: any) => ({
                id: `lw-${s.id}`,
                trackingNumber: s.trackingNumber || s.referenceCode,
                contents: s.description || 'Logicware Package',
                status: s.status?.name || 'In Transit',
                shippingDate: s.createdAt,
                customerId: s.shipperId,
                customerName: s.shipper?.name || 'Logicware Customer',
                isLogicware: true,
                externalUrl: s.trackingUrl || `https://from-store-to-door.logicware.app/tracking/${s.trackingNumber}`
            }))
        });

    } catch (error: any) {
        console.error('Logicware Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Failed to fetch from Logicware.' 
        }, { status: 500 });
    }
}
