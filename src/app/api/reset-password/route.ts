import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { getSiteOrigin } from '@/lib/utils';

/**
 * @fileOverview Hardened Reset Password API for FromStore2Door OS.
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
            return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
        }

        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ message: 'Target identity missing.' }, { status: 400 });

        const { data: targetProfile } = await adminClient.from('profiles').select('email').eq('id', userId).single();
        if (!targetProfile?.email) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

        const origin = getSiteOrigin(request);
        const { error } = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email: targetProfile.email,
            options: {
                redirectTo: `${origin}/auth/callback?next=/reset-password`
            }
        });

        if (error) throw error;

        await adminClient.from('system_logs').insert({
            log_type: 'password_reset_dispatch',
            description: `Security reset link dispatched to ${targetProfile.email}`,
            actor_id: caller.id,
            metadata: { targetUserId: userId }
        });

        return NextResponse.json({ success: true, message: 'Reset protocol authorized.' });

    } catch (error: any) {
        console.error("[API:RESET_PASSWORD] FATAL:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
