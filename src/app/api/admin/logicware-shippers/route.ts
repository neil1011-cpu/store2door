import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipper Sync using Supabase config.
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
