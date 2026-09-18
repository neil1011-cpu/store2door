import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/utils';

/**
 * Forgot Password API for manual dispatches.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;
        if (!email) return NextResponse.json({ message: 'Email required.' }, { status: 400 });

        const supabase = await createAdminClient();
        const origin = getSiteOrigin(request);
        const redirectTo = `${origin}/auth/callback?next=/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Reset link dispatched.' });
    } catch (error: any) {
        console.error('[API_FORGOT_PASSWORD] FATAL:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
