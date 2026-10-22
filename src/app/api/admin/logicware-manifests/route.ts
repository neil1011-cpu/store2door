import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Fetches live manifests from the Logicware portal.
 */

export async function POST() {
    try {
        const client = await getLogicwareClient();
        if (!client) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware configuration missing.' 
            }, { status: 400 });
        }

        // SDK v0.2.0 might not have manifests resource depending on API key permissions
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
