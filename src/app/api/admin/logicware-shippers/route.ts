import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

export async function POST(request: Request) {
    try {
        const client = await getLogicwareClient();
        if (!client) {
            return NextResponse.json({ success: false, message: 'Logicware configuration missing.' }, { status: 400 });
        }

        if (!client.shippers) throw new Error('Shippers module not available.');
        
        // Corrected parameter name from limit to pageSize for SDK v0.2.0
        const response = await client.shippers.list({ pageSize: 100 });
        const list = Array.isArray(response) ? response : (response.data || []);

        return NextResponse.json({ success: true, shippers: list });

    } catch (error: any) {
        console.error('Logicware Shippers Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub failure.' 
        }, { status: 500 });
    }
}
