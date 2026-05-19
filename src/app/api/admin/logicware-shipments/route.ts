import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Fetches live shipments from the Logicware portal.
 * Centralized: Automatically pulls API key from Firestore if not provided.
 */

export async function POST(request: Request) {
    try {
        let payload: any = {};
        try {
            const body = await request.json();
            payload = body || {};
        } catch (e) {
            // Allow empty or malformed body
        }
        
        let apiKey = payload.apiKey;

        // 1. Fallback to System Settings if key not in request
        if (!apiKey) {
            try {
                const configSnap = await adminDb.collection('metadata').doc('logicware').get();
                if (configSnap.exists) {
                    apiKey = configSnap.data()?.apiKey;
                }
            } catch (dbError) {
                console.error('Firestore Metadata Fetch Error:', dbError);
            }
        }

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware Integration not configured. Please save your API key in Settings first.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // 2. Fetch recent shipments from Logicware
        const shipments = await client.shipments.list({
            limit: 100,
            sort: 'desc'
        });

        if (!Array.isArray(shipments)) {
            throw new Error('Unexpected response format from Logicware API.');
        }

        return NextResponse.json({ 
            success: true, 
            shipments: shipments.map((s: any) => ({
                id: `lw-${s.id}`,
                trackingNumber: s.trackingNumber || s.referenceCode || 'NO-REF',
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
        console.error('Logicware Fetch API Route Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'A critical error occurred while fetching from Logicware.' 
        }, { status: 500 });
    }
}
