import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipment Sync using Supabase config.
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
                const adminClient = await createAdminClient();
                const { data: configDoc } = await adminClient
                    .from('system_configs')
                    .select('config_value')
                    .eq('config_key', 'logicware')
                    .maybeSingle();
                
                if (configDoc?.config_value?.apiKey) {
                    apiKey = configDoc.config_value.apiKey;
                }
            } catch (dbError) {}
        }

        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'Configuration missing in registry.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');
        
        let results: any[] = [];
        if (client.shipments) {
            results = await client.shipments.list({ limit: 100, sort: 'desc' });
        } else if (client.shippers) {
            results = await client.shippers.list();
        }

        if (!Array.isArray(results)) {
            const raw: any = results;
            results = raw.data || raw.shipments || [];
        }

        return NextResponse.json({ success: true, shipments: results });

    } catch (error: any) {
        console.error('Logicware Shipments Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
