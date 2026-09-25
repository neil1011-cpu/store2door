import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Shipper Sync API.
 * Authoritatively retrieves credentials from the registry and registers a local user in the Logicware Hub.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    let payload;
    
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const { shipper } = payload;

    if (!shipper || !shipper.email) {
        return NextResponse.json({ message: 'Missing integration payload: email is required.' }, { status: 400 });
    }

    try {
        // 1. Fetch API Key from Supabase Registry
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const apiKey = configDoc?.config_value?.apiKey || process.env.LOGICWARE_API_KEY;

        if (!apiKey || apiKey === '********') {
            await adminClient.from('system_logs').insert({
                log_type: 'logicware_sync_skipped',
                description: `Sync skipped for ${shipper.email}: Logicware API key not configured in registry.`,
                metadata: { email: shipper.email }
            });
            return NextResponse.json({ message: 'Logicware Hub not configured in registry.' }, { status: 400 });
        }

        const client = getLogicwareClient(apiKey);
        if (!client) throw new Error('SDK Initialization Failed');
        
        // 2. Prepare Data Mapping
        const firstName = shipper.firstName || shipper.full_name?.split(' ')[0] || 'User';
        const lastName = shipper.lastName || shipper.full_name?.split(' ').slice(1).join(' ') || 'FSTD-Client';

        // 3. Register the user as a shipper in Logicware
        const result = await client.shippers.create({
            email: shipper.email,
            firstName,
            lastName,
            phoneNumber: shipper.phone || '',
            referenceCode: shipper.mailbox || shipper.mailboxNumber || '', 
        });

        // 4. Log the success to System Logs
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_success',
            description: `User ${shipper.email} synchronized with Logicware Hub.`,
            metadata: { logicwareId: result.id, mailbox: shipper.mailbox || shipper.mailboxNumber }
        });

        return NextResponse.json({ 
            success: true, 
            logicwareId: result.id,
            message: 'Shipper synchronized with Logicware portal.'
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error);
        
        // Log failure for admin review
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_failed',
            description: `Hub sync failed for ${shipper.email}: ${error.message}`,
            metadata: { error: error.message, shipperEmail: shipper.email }
        });

        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logicware registration encountered an exception.' 
        }, { status: 500 });
    }
}
