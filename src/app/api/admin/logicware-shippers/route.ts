
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Authorized Hub Shippers Fetcher.
 * Standardized for SDK v0.2.0.
 */

export async function POST(request: Request) {
    try {
        const client = await getLogicwareClient();
        if (!client) {
            return NextResponse.json({ success: false, message: 'Logicware configuration missing.' }, { status: 400 });
        }

        if (!client.shippers) throw new Error('Shippers module not available.');
        
        const response = await client.shippers.list({ pageSize: 100 });
        const list = Array.isArray(response) ? response : ((response as any).data || []);

        return NextResponse.json({ success: true, shippers: list });

    } catch (error: any) {
        console.error('Logicware Shippers Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub failure.' 
        }, { status: 500 });
    }
}
