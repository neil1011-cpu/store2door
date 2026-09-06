
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Forgot Password API using Supabase Auth.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;
        if (!email) return NextResponse.json({ message: 'Email required' }, { status: 400 });

        const supabase = await createAdminClient();
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${new URL(request.url).origin}/account/change-password`,
        });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Reset link dispatched via Supabase.' });

    } catch (error: any) {
        console.error('[FORGOT PASSWORD ERROR]:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
