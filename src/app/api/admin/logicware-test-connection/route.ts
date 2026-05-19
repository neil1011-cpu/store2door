import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Simple health check for the Logicware API Key.
 */

export async function POST(request: Request) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'API Key is missing.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // Attempt a minimal operation to verify the key
        // Most Logicware-style APIs will return a 401/403 if the key is invalid
        await client.shippers.list({
            limit: 1
        });

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
