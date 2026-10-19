import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Hardened Logicware Shipment Fetcher.
 * Robust unwrapping of Logicware SDK responses and detailed diagnostic meta-data.
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
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware Hub not configured in registry.' 
            }, { status: 400 });
        }
        
        let rawResults: any = [];
        try {
            rawResults = await client.shipments.list({ limit: 100 });
        } catch (err: any) {
            console.error('[LOGICWARE_API] Primary shipments.list failed:', err.message);
            if (client.shippers) {
                rawResults = await client.shippers.list();
            } else {
                throw err;
            }
        }

        let shipmentsArray = [];
        if (Array.isArray(rawResults)) {
            shipmentsArray = rawResults;
        } else if (rawResults && typeof rawResults === 'object') {
            shipmentsArray = (rawResults as any).data || (rawResults as any).shipments || (rawResults as any).results || (rawResults as any).data?.shipments || [];
        }

        return NextResponse.json({ 
            success: true, 
            shipments: shipmentsArray,
            diagnostic: {
                rawCount: shipmentsArray.length,
                structure: rawResults ? typeof rawResults : 'null',
                firstItemFields: shipmentsArray.length > 0 ? Object.keys(shipmentsArray[0]) : []
            }
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SHIPMENTS] FATAL:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub unreachable.' 
        }, { status: 500 });
    }
}
