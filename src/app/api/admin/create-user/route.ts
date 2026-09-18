import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Hardened User Creation API.
 * Prioritizes token-based auth to bypass cookie restrictions.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
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

    const isMasterAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isMasterAdmin) {
      return NextResponse.json({ message: 'Access Denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin, mailboxNumber, sendWelcomeEmail } = body;

    const tempPassword = Math.random().toString(36).slice(-16) + 'A1!z';
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;

    const userId = newUser.user.id;
    const finalMailboxNumber = mailboxNumber?.trim() || `FSTD${Math.floor(1000 + Math.random() * 9000)}`;

    await Promise.all([
      adminClient.from('profiles').upsert({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: finalMailboxNumber
      }),
      adminClient.from('app_roles').upsert({
        user_id: userId,
        role: isAdmin ? 'admin' : 'customer'
      })
    ]);

    if (sendWelcomeEmail) {
        await adminClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${new URL(request.url).origin}/auth/confirm?next=/account/change-password`
        });
        
        await adminClient.from('system_logs').insert({
            log_type: 'welcome_reset_dispatch',
            description: `Welcome protocol initiated for ${email}. Reset link dispatched.`,
            actor_id: caller.id,
            metadata: { targetUserId: userId }
        });
    }

    return NextResponse.json({ 
        success: true, 
        uid: userId, 
        mailboxNumber: finalMailboxNumber
    });

  } catch (error: any) {
    console.error(`[API:CREATE_USER] FATAL:`, error.message);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
