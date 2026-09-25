import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Shipper Sync API.
 * Authenticates with the registry and registers a local user in the Logicware Hub.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { shipper } = body;

        if (!shipper || !shipper.email) {
            return NextResponse.json({ message: 'Missing integration payload' }, { status: 400 });
        }

        // 1. Fetch API Key from Registry
        const adminClient = await createAdminClient();
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const apiKey = configDoc?.config_value?.apiKey || process.env.LOGICWARE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ message: 'Logicware Hub not configured in registry.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');
        
        // 2. Register the user as a shipper in Logicware
        const result = await client.shippers.create({
            email: shipper.email,
            firstName: shipper.firstName || shipper.full_name?.split(' ')[0] || 'User',
            lastName: shipper.lastName || shipper.full_name?.split(' ').slice(1).join(' ') || 'Legacy',
            phoneNumber: shipper.phone || '',
            referenceCode: shipper.mailbox || shipper.mailboxNumber, 
        });

        // 3. Log the success
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_success',
            description: `User ${shipper.email} synchronized with Logicware Hub (ID: ${result.id})`,
            metadata: { logicwareId: result.id, mailbox: shipper.mailbox }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId: result.id,
            message: 'Shipper synchronized with Logicware portal.'
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logicware registration skipped.' 
        }, { status: 500 });
    }
}
