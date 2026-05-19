import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Fetches live shipments from the Logicware portal.
 */

export async function POST(request: Request) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ message: 'Logicware API Key required' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // Fetch recent shipments from Logicware
        const shipments = await client.shipments.list({
            limit: 50,
            sort: 'desc'
        });

        return NextResponse.json({ 
            success: true, 
            shipments: shipments.map((s: any) => ({
                id: `lw-${s.id}`,
                trackingNumber: s.trackingNumber || s.referenceCode,
                contents: s.description || 'Logicware Package',
                status: s.status?.name || 'In Transit',
                shippingDate: s.createdAt,
                customerId: s.shipperId,
                isLogicware: true,
                externalUrl: s.trackingUrl
            }))
        });

    } catch (error: any) {
        console.error('Logicware Fetch Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Failed to fetch from Logicware.' 
        }, { status: 500 });
    }
}
