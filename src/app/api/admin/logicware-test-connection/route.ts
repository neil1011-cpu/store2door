
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Simple health check for the Logicware API Key.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const apiKey = body?.apiKey;

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'API Key is missing.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // Attempt a minimal operation to verify the key.
        // We try shippers list as a primary verification.
        try {
            await client.shippers.list({ limit: 1 });
        } catch (err: any) {
            // If shippers fails, try shipments. Some keys might have restricted scopes.
            try {
                await client.shipments.list({ limit: 1 });
            } catch (innerErr: any) {
                throw new Error(innerErr.message || err.message || 'Authentication failed.');
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Connection verified. Your API key is valid.' 
        });

    } catch (error: any) {
        console.error('Logicware Verification Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Authentication failed. Please check your API key.' 
        }, { status: 401 });
    }
}
