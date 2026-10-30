import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Connection tester aligned with SDK v0.2.0.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const apiKey = body?.apiKey;

        if (!apiKey) return NextResponse.json({ success: false, message: 'API Key missing.' }, { status: 400 });

        const client = await getLogicwareClient(apiKey);
        if (!client) throw new Error('Client initialization failed.');
        
        // Use modern pageSize and check modules existence
        if (client.packages) {
            await client.packages.list({ pageSize: 1 });
        } else if (client.shippers) {
            await client.shippers.list({ pageSize: 1 });
        }

        return NextResponse.json({ success: true, message: 'Connection verified.' });

    } catch (error: any) {
        console.error('Logicware Verification Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Authentication failed.' 
        }, { status: 401 });
    }
}