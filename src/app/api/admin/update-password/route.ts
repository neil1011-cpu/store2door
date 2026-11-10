import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Privileged Direct Password Update API.
 * Allows administrators to force-set a user's password without magic links.
 */

export async function POST(request: Request) {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    try {
        const supabase = await createClient();
        let caller;

        if (token) {
            const { data } = await supabase.auth.getUser(token);
            caller = data?.user;
        } else {
            const { data } = await supabase.auth.getUser();
            caller = data?.user;
        }

        if (!caller) {
            return NextResponse.json({ message: 'Administrative session required.' }, { status: 401 });
        }

        const adminClient = await createAdminClient();
        
        // 1. Verify Caller Authority
        const { data: roleData } = await adminClient
            .from('app_roles')
            .select('role')
            .eq('user_id', caller.id)
            .eq('role', 'admin')
            .maybeSingle();

        const isMaster = caller.email === 'admin@neilussolutions.com';

        if (!roleData && !isMaster) {
            return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
        }

        const { userId, password } = await request.json();

        if (!userId || !password) {
            return NextResponse.json({ message: 'User ID and Password are required.' }, { status: 400 });
        }

        // 2. PROTECTION: Prevent master admin modification via this standard route
        const { data: targetProfile } = await adminClient.from('profiles').select('email').eq('id', userId).single();
        if (targetProfile?.email === 'admin@neilussolutions.com' && caller.email !== 'admin@neilussolutions.com') {
             return NextResponse.json({ message: 'The master administrator identity is immutable.' }, { status: 403 });
        }

        // 3. Force Password Update
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            password: password,
            user_metadata: { needs_password_reset: false } // Clear the flag if set
        });

        if (authError) throw authError;

        // 4. Audit Logging
        await adminClient.from('system_logs').insert({
            log_type: 'direct_password_update',
            description: `Password manually updated for ${targetProfile?.email || userId} by administrator.`,
            actor_id: caller.id,
            metadata: { targetUserId: userId }
        });

        return NextResponse.json({ success: true, message: 'Access key updated successfully.' });

    } catch (error: any) {
        console.error("[API:UPDATE_PASSWORD] FATAL:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
