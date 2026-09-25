import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Fetches live manifests from the Logicware portal using Supabase config.
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

        // 1. Fetch from Registry
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
            } catch (dbError) {
                console.error('Supabase Config Fetch Error:', dbError);
            }
        }

        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware configuration missing in registry.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');
        
        let results: any[] = [];
        if (client.manifests) {
            results = await client.manifests.list({
                limit: 100,
                sort: 'desc'
            });
        }

        // Standardize response format
        let finalArray = Array.isArray(results) ? results : (results as any).data || (results as any).manifests || [];

        return NextResponse.json({ 
            success: true, 
            manifests: finalArray
        });

    } catch (error: any) {
        console.error('Logicware Manifest Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub communication failure.' 
        }, { status: 500 });
    }
}
