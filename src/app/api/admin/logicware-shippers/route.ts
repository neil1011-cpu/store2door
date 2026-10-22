import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipper Sync using Supabase config.
 * Updated to use 'pageSize' and 'data' field for SDK v0.2.0 compatibility.
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

        const client = await getLogicwareClient(apiKey);
        if (!client) {
            return NextResponse.json({ success: false, message: 'Logicware configuration missing in registry.' }, { status: 400 });
        }

        if (!client.shippers) throw new Error('Shippers module not available on this API key.');
        
        // SDK v0.2.0 uses pageSize instead of limit
        const response = await client.shippers.list({ pageSize: 100 });
        
        const list = Array.isArray(response) ? response : (response.data || []);

        return NextResponse.json({ success: true, shippers: list });

    } catch (error: any) {
        console.error('Logicware Shippers Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
