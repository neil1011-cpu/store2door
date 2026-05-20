import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Fetches live shipments from the Logicware portal.
 * Hardened to handle body parsing and key retrieval safely.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
    try {
        const payload = await getSafeBody(request);
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
                message: 'Logicware configuration missing. Save your key in Settings.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // 2. Fetch recent shipments from Logicware
        const shipments = await client.shipments.list({
            limit: 100,
            sort: 'desc'
        });

        if (!Array.isArray(shipments)) {
            throw new Error('Invalid response from Logistics Hub.');
        }

        return NextResponse.json({ 
            success: true, 
            shipments: shipments.map((s: any) => ({
                id: `lw-${s.id}`,
                trackingNumber: s.trackingNumber || s.referenceCode || 'NO-REF',
                contents: s.description || 'Global Package',
                status: s.status?.name || 'In Transit',
                shippingDate: s.createdAt,
                customerId: s.shipperId,
                customerName: s.shipper?.name || 'Customer',
                isLogicware: true,
                externalUrl: s.trackingUrl || `https://from-store-to-door.logicware.app/tracking/${s.trackingNumber}`
            }))
        });

    } catch (error: any) {
        console.error('Logicware Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
