
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipper Sync.
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

        if (!apiKey) {
            try {
                const configSnap = await adminDb.collection('metadata').doc('logicware').get();
                if (configSnap.exists) {
                    apiKey = configSnap.data()?.apiKey;
                }
            } catch (dbError) {}
        }

        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'Configuration missing.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client?.shippers) throw new Error('Shippers module not available on this API key.');
        
        const results = await client.shippers.list({ limit: 100 });
        
        let finalArray = Array.isArray(results) ? results : (results as any).data || [];

        return NextResponse.json({ success: true, shippers: finalArray });

    } catch (error: any) {
        console.error('Logicware Shippers Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
