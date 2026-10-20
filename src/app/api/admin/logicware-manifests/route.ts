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

        const client = await getLogicwareClient(apiKey);
        if (!client) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware configuration missing.' 
            }, { status: 400 });
        }

        if (!client.manifests) {
             return NextResponse.json({ success: true, manifests: [] });
        }
        
        const results: any = await client.manifests.list({ pageSize: 100 });
        
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
