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
            // Check process.env directly on server
            apiKey = process.env.LOGICWARE_API_KEY;
        }

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware configuration missing. Save your key in Settings.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // 2. Fetch recent shipments from Logicware
        // We attempt shipments first, fallback to shippers if that's what the key provides
        let results: any[] = [];
        try {
            results = await client.shipments.list({
                limit: 100,
                sort: 'desc'
            });
        } catch (shipmentErr) {
            console.warn('Shipments fetch restricted, falling back to shippers.');
            results = await client.shippers.list();
        }

        if (!Array.isArray(results)) {
            // Handle if the SDK returns an object with a data property
            const raw: any = results;
            results = raw.data || raw.shipments || raw.shippers || [];
        }

        return NextResponse.json({ 
            success: true, 
            shipments: results
        });

    } catch (error: any) {
        console.error('Logicware Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
