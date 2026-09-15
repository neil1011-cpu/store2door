import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Hardened User Creation API.
 * Prioritizes Authorization header but falls back to cookie session.
 * Now includes support for immediate "Welcome Reset" dispatch.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  const headerList = await headers();
  const authHeader = headerList.get('authorization');
  
  // Extract token from Bearer header
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  try {
    const supabase = await createClient();
    let caller;
    let authError;

    // AUTHENTICATION
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      caller = data?.user;
      authError = error;
    } else {
      const { data, error } = await supabase.auth.getUser();
      caller = data?.user;
      authError = error;
    }

    if (!caller) {
      return NextResponse.json({ 
        message: 'Administrative session not found. Please refresh and log in again.',
        debug: {
          hasCookies: (await request.headers.get('cookie')) ? true : false,
          authError: authError?.message || 'Auth session missing!',
          requestId
        }
      }, { status: 401 });
    }

    // AUTHORIZATION
    const adminClient = await createAdminClient();
    const { data: roleData } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    const isMasterAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isMasterAdmin) {
      return NextResponse.json({ 
        message: 'Access Denied: Administrative authority required.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // EXECUTION
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin, mailboxNumber, sendWelcomeEmail } = body;

    const tempPassword = Math.random().toString(36).slice(-16) + 'A1!z';
    
    // 1. Create Auth User
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;

    const userId = newUser.user.id;
    
    // 2. Initialize Profile & Role
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

    // 3. Optional: Dispatch Welcome Reset Link
    if (sendWelcomeEmail) {
        await adminClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${new URL(request.url).origin}/account/change-password`
        });
        
        // Log the security event
        await adminClient.from('system_logs').insert({
            log_type: 'welcome_reset_dispatch',
            description: `Welcome protocol initiated for ${email}. Reset link dispatched.`,
            actor_id: caller.id,
            metadata: { targetUserId: userId, requestId }
        });
    }

    return NextResponse.json({ 
        success: true, 
        uid: userId, 
        mailboxNumber: finalMailboxNumber,
        welcomeDispatched: !!sendWelcomeEmail
    });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL:`, error.message);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
