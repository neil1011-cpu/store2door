
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative reset link generation using Supabase Auth.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { userId } = body;

        const supabase = await createAdminClient();
        
        // 1. Verify Caller is Admin
        const { data: { user: caller } } = await supabase.auth.getUser(authHeader.split(' ')[1]);
        const { data: isAdmin } = await supabase.rpc('is_admin');
        
        if (!isAdmin && caller?.email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Admin access denied' }, { status: 403 });
        }

        // 2. Fetch target user email
        const { data: targetProfile } = await supabase.from('profiles').select('email').eq('id', userId).single();
        if (!targetProfile?.email) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        // 3. Generate Link
        const { error } = await supabase.auth.resetPasswordForEmail(targetProfile.email, {
            redirectTo: `${new URL(request.url).origin}/account/change-password`,
        });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Reset link dispatched via Supabase Auth.' });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
