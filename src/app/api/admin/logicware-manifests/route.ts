import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Fetches live manifests from the Logicware portal using Supabase config.
 * Simplified call to ensure compatibility with all Hub API versions.
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

        if (!apiKey) apiKey = process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware configuration missing.' 
            }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client || !client.manifests) {
             return NextResponse.json({ success: true, manifests: [] });
        }
        
        const results: any = await client.manifests.list({ limit: 100 });
        
        let manifestsArray = [];
        if (Array.isArray(results)) {
            manifestsArray = results;
        } else if (results && typeof results === 'object') {
            manifestsArray = results.data || results.manifests || results.results || [];
        }

        return NextResponse.json({ 
            success: true, 
            manifests: manifestsArray 
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:MANIFESTS] ERROR:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Manifest registry unreachable.' 
        }, { status: 500 });
    }
}
