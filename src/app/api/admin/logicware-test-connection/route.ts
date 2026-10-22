import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Simple health check for the Logicware API Key.
 * Standardized to use 'pageSize' and check 'packages' resource for v0.2.0.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const apiKey = body?.apiKey;

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'API Key is missing.' }, { status: 400 });
        }

        const client = await getLogicwareClient(apiKey);
        if (!client) throw new Error('Client initialization failed.');
        
        // Check for either packages or shippers resource
        const testResource = (client as any).packages || client.shippers;
        
        if (testResource) {
            await testResource.list({ pageSize: 1 });
        } else {
            throw new Error('API Key valid but no accessible modules found.');
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
