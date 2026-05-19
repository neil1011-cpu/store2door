import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

/**
 * @fileOverview Secure server-side bridge for Logicware Shipper Sync.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!body) throw new Error('Request payload is null');

        const { apiKey, shipper } = body;

        if (!apiKey || !shipper) {
            return NextResponse.json({ message: 'Missing integration payload' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        
        // Register the user as a shipper in Logicware
        const result = await client.shippers.create({
            email: shipper.email,
            firstName: shipper.firstName,
            lastName: shipper.lastName,
            phoneNumber: shipper.phone,
            referenceCode: shipper.mailbox, // Syncing FSTD code as reference
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId: result.id,
            message: 'Shipper synchronized with Logicware portal.'
        });

    } catch (error: any) {
        console.error('Logicware Sync Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logicware registration skipped.' 
        }, { status: 500 });
    }
}
