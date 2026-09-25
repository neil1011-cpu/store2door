
import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Bulk User Synchronization API.
 * Iterates through the local Supabase registry and pushes all users to the Logicware Hub.
 */

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: caller } } = await supabase.auth.getUser();
        if (!caller) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const adminClient = await createAdminClient();

        // 1. Verify Admin Status
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (!isAdmin && caller.email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
        }

        // 2. Fetch Logicware Config
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'logicware')
            .maybeSingle();
        
        const apiKey = configDoc?.config_value?.apiKey;
        if (!apiKey || apiKey === '********') {
            return NextResponse.json({ message: 'Logicware Hub not configured in registry.' }, { status: 400 });
        }

        const lwClient = getLogicwareClient(apiKey);
        if (!lwClient) throw new Error('SDK Initialization Failed');

        // 3. Fetch All Local Profiles
        const { data: profiles, error: profileError } = await adminClient
            .from('profiles')
            .select('*');
        
        if (profileError) throw profileError;

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        // 4. Sequential Mirroring
        for (const profile of (profiles || [])) {
            try {
                const nameParts = profile.full_name.split(' ');
                const firstName = nameParts[0] || 'User';
                const lastName = nameParts.slice(1).join(' ') || 'FSTD-Client';

                await lwClient.shippers.create({
                    email: profile.email,
                    firstName,
                    lastName,
                    phoneNumber: profile.phone || '',
                    referenceCode: profile.mailbox_number
                });
                successCount++;
            } catch (err: any) {
                // Logicware often returns error if user exists; we count that as a "skip"
                if (err.message?.toLowerCase().includes('already exists') || err.code === 409) {
                    skipCount++;
                } else {
                    console.error(`[SYNC_ALL] Failed for ${profile.email}:`, err.message);
                    failCount++;
                }
            }
        }

        // 5. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_bulk_sync',
            description: `Bulk user sync complete: ${successCount} mirrored, ${skipCount} already existed, ${failCount} failed.`,
            actor_id: caller.id,
            metadata: { successCount, skipCount, failCount }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Synchronization complete. Mirrored: ${successCount}, Skips: ${skipCount}, Errors: ${failCount}` 
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC_ALL] FATAL:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
