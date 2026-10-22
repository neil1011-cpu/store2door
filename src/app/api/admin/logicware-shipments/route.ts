import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Hardened Logicware Package Fetcher.
 * Uses correct 'packages' resource for SDK v0.2.0.
 */

export async function POST(request: Request) {
    try {
        const client = await getLogicwareClient();
        if (!client) {
            return NextResponse.json({ 
                success: false, 
                message: 'Logicware Hub not configured in registry.' 
            }, { status: 400 });
        }
        
        // SDK v0.2.0 uses 'packages'
        const packagesResource = (client as any).packages;
        if (!packagesResource) {
            throw new Error('Packages resource not found in SDK.');
        }

        const rawResults = await packagesResource.list({ limit: 100 });

        let shipmentsArray = [];
        if (Array.isArray(rawResults)) {
            shipmentsArray = rawResults;
        } else if (rawResults && typeof rawResults === 'object') {
            shipmentsArray = (rawResults as any).data || (rawResults as any).packages || (rawResults as any).results || [];
        }

        return NextResponse.json({ 
            success: true, 
            shipments: shipmentsArray
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SHIPMENTS] FATAL:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logistics Hub unreachable.' 
        }, { status: 500 });
    }
}
