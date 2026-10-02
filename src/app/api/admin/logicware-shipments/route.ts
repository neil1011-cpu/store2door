import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

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

        // 1. Authoritative API Key Resolution from Registry
        if (!apiKey) {
            const adminClient = await createAdminClient();
            const { data: configDoc } = await adminClient
                .from('system_configs')
                .select('config_value')
                .eq('config_key', 'logicware')
                .maybeSingle();
            
            if (configDoc?.config_value?.apiKey && configDoc.config_value.apiKey !== '********') {
                apiKey = configDoc.config_value.apiKey;
            }
        }

        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware Hub not configured in registry.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('Logicware SDK Initialization Failed.');
        
        let rawResults: any = [];
        try {
            // Attempt to list latest shipments
            rawResults = await client.shipments.list({ limit: 100 });
        } catch (err: any) {
            console.error('[LOGICWARE_API] Primary shipments.list failed:', err.message);
            // Fallback for older Hub versions
            if (client.shippers) {
                rawResults = await client.shippers.list();
            } else {
                throw err;
            }
        }

        // 2. ROBUST UNWRAPPING: Logicware SDK varies by Hub version
        let shipmentsArray = [];
        if (Array.isArray(rawResults)) {
            shipmentsArray = rawResults;
        } else if (rawResults && typeof rawResults === 'object') {
            shipmentsArray = rawResults.data || rawResults.shipments || rawResults.results || rawResults.data?.shipments || [];
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
