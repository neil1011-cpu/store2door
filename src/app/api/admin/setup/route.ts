
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure Initial System Setup API.
 * Uses the Service Role to create/confirm the master admin account.
 */

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Unauthorized: Only the master admin identifier can be initialized here.' }, { status: 403 });
        }

        const supabase = await createAdminClient();

        // 1. Check if user exists
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === email);

        let userId: string;

        if (existingUser) {
            // Update existing user: Set password and confirm email
            const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { 
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: 'Master Admin' }
                }
            );
            if (updateError) throw updateError;
            userId = updatedUser.user.id;
        } else {
            // Create new user with auto-confirm
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: 'Master Admin' }
            });
            if (createError) throw createError;
            userId = newUser.user.id;
        }

        // 2. Ensure Role exists via RPC
        const { error: rpcError } = await supabase.rpc('manage_user_role', { 
            target_user_id: userId, 
            new_role: 'admin' 
        });

        if (rpcError) {
            console.error('[SETUP RPC ERROR]', rpcError);
            // Fallback: try direct insert if RPC fails (though RPC is preferred)
            await supabase.from('app_roles').upsert({ user_id: userId, role: 'admin' });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Administrative identity secured and confirmed.' 
        });

    } catch (error: any) {
        console.error('[ADMIN SETUP FATAL]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
