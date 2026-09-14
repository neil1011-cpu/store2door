
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Hardened User Deletion API (Supabase Native).
 * Executes deep identity purge while protecting master admin accounts.
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
        const { data: roleData } = await adminClient
            .from('app_roles')
            .select('role')
            .eq('user_id', caller.id)
            .eq('role', 'admin')
            .maybeSingle();

        const isMaster = caller.email === 'admin@neilussolutions.com';

        if (!roleData && !isMaster) {
            return NextResponse.json({ message: 'Access Denied.' }, { status: 403 });
        }

        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ message: 'User ID required.' }, { status: 400 });

        // PROTECTION: Prevent master admin deletion
        const { data: targetProfile } = await adminClient.from('profiles').select('email').eq('id', userId).single();
        if (targetProfile?.email === 'admin@neilussolutions.com') {
             return NextResponse.json({ message: 'The master administrator identity is immutable.' }, { status: 403 });
        }

        // EXECUTE PURGE (Supabase Auth Admin SDK handles DB cascades if configured, 
        // but we explicitly delete from profiles/roles first for safety)
        await adminClient.from('app_roles').delete().eq('user_id', userId);
        await adminClient.from('shipments').delete().eq('profile_id', userId);
        await adminClient.from('pre_alerts').delete().eq('profile_id', userId);
        await adminClient.from('invoices').delete().eq('profile_id', userId);
        await adminClient.from('profiles').delete().eq('id', userId);

        const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        // Log the audit event
        await adminClient.from('system_logs').insert({
            log_type: 'identity_purge',
            description: `Identity record for ${targetProfile?.email || userId} purged from registry.`,
            actor_id: caller.id
        });

        return NextResponse.json({ success: true, message: 'Identity permanently purged.' });

    } catch (error: any) {
        console.error("[API:DELETE_USER] FATAL:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
