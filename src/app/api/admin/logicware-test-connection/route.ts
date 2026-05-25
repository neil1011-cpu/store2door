
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
        
        // Defensive module verification
        if (client.shippers) {
            await client.shippers.list({ limit: 1 });
        } else if (client.shipments) {
            await client.shipments.list({ limit: 1 });
        } else {
            throw new Error('API Key valid but no accessible modules (shippers/shipments) found.');
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
