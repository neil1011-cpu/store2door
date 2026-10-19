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

        const lwClient = await getLogicwareClient();
        if (!lwClient) {
            return NextResponse.json({ message: 'Logicware Hub not configured in registry.' }, { status: 400 });
        }

        // 2. Fetch All Local Profiles
        const { data: profiles, error: profileError } = await adminClient
            .from('profiles')
            .select('*');
        
        if (profileError) throw profileError;

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        // 3. Sequential Mirroring
        for (const profile of (profiles || [])) {
            try {
                await lwClient.shippers.create({
                    email: profile.email,
                    name: profile.full_name,
                    phone: profile.phone || '',
                    reference: profile.mailbox_number
                });
                successCount++;
            } catch (err: any) {
                if (err.message?.toLowerCase().includes('already exists') || err.code === 409) {
                    skipCount++;
                } else {
                    console.error(`[SYNC_ALL] Failed for ${profile.email}:`, err.message);
                    failCount++;
                }
            }
        }

        // 4. Audit Log
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
