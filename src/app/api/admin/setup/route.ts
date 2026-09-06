import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure Initial System Setup API.
 * Uses the Service Role to create/confirm the master admin account.
 */

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Security Lock: Only the domain-hardcoded master admin can use this endpoint
        if (email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Unauthorized: Access restricted to the master administrator identifier.' }, { status: 403 });
        }

        const supabase = await createAdminClient();

        // 1. Identify if account exists in Auth Registry
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === email);

        let userId: string;

        if (existingUser) {
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
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: 'Master Admin' }
            });
            if (createError) throw createError;
            userId = newUser.user.id;
        }

        // 2. Grant 'admin' role in the permissions table
        await supabase.from('app_roles').upsert({ 
            user_id: userId, 
            role: 'admin' 
        }, { onConflict: 'user_id, role' });

        // 3. Ensure profile is established
        await supabase.from('profiles').upsert({
            id: userId,
            email: email,
            full_name: 'Master Admin',
            mailbox_number: 'FSTD-ADMIN'
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Administrative identity secured and confirmed in Supabase.' 
        });

    } catch (error: any) {
        console.error('[ADMIN SETUP FATAL]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}