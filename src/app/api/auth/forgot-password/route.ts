import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Forgot Password API using Supabase Auth.
 * Dispatches a password reset email via the callback for PKCE code exchange.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;
        if (!email) return NextResponse.json({ message: 'Email identifier required.' }, { status: 400 });

        const supabase = await createAdminClient();
        
        // Construct the full absolute URL for the callback
        const origin = new URL(request.url).origin;
        const redirectTo = `${origin}/auth/callback?next=/account/change-password`;

        console.log(`[AUTH] Dispatching reset link for ${email}. Redirecting to: ${redirectTo}`);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        });

        if (error) throw error;

        // Log the attempt in system logs for audit
        await supabase.from('system_logs').insert({
            log_type: 'recovery_request',
            description: `Password recovery protocol initiated for ${email}.`,
            metadata: { email, redirectTo }
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Reset instructions dispatched via Supabase.' 
        });

    } catch (error: any) {
        console.error('[FORGOT PASSWORD ERROR]:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
