import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipment Sync using Supabase config.
 * Hardened to handle various SDK response formats and provide diagnostic feedback.
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

        // 1. Fetch from Registry if not in payload
        if (!apiKey) {
            const adminClient = await createAdminClient();
            const { data: configDoc } = await adminClient
                .from('system_configs')
                .select('config_value')
                .eq('config_key', 'logicware')
                .maybeSingle();
            
            if (configDoc?.config_value?.apiKey) {
                apiKey = configDoc.config_value.apiKey;
            }
        }

        // 2. Final Fallback to Environment
        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware API Key not found in registry or environment.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');
        
        let results: any = [];
        try {
            // Attempt to list shipments
            results = await client.shipments.list({ limit: 100 });
        } catch (err) {
            // Fallback for older keys/modules
            if (client.shippers) {
                results = await client.shippers.list();
            } else {
                throw err;
            }
        }

        // Normalize SDK response (it might be { data: [...] } or { shipments: [...] })
        let shipmentsArray = [];
        if (Array.isArray(results)) {
            shipmentsArray = results;
        } else if (results && typeof results === 'object') {
            shipmentsArray = results.data || results.shipments || results.results || [];
        }

        return NextResponse.json({ 
            success: true, 
            shipments: shipmentsArray,
            count: shipmentsArray.length,
            note: shipmentsArray.length === 0 ? 'Connection successful but no records found in Hub.' : null
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SHIPMENTS] FATAL:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
