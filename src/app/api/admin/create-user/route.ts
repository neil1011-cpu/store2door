import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Hardened User Creation API with Explicit Token Propagation and Manual Mailbox Support.
 * Prioritizes Authorization header to bypass cookie restrictions in production.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  const headerList = await headers();
  const authHeader = headerList.get('authorization');
  const cookieHeader = headerList.get('cookie') || 'NONE';
  
  // Extract token from Bearer header
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  try {
    const supabase = await createClient();
    let caller;
    let authError;

    // AUTHENTICATION: Use explicit token if provided, otherwise fallback to cookies
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      caller = data?.user;
      authError = error;
    } else {
      const { data, error } = await supabase.auth.getUser();
      caller = data?.user;
      authError = error;
    }

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] AUTH_FAILURE:`, {
        error: authError?.message,
        hasToken: !!token,
        hasCookies: cookieHeader !== 'NONE'
      });
      
      return NextResponse.json({ 
        message: 'Administrative session not found. Please refresh and log in again.',
        debug: {
          hasCookies: cookieHeader !== 'NONE',
          hasToken: !!token,
          authError: authError?.message || 'Auth session missing!',
          requestId
        }
      }, { status: 401 });
    }

    // AUTHORIZATION: Verify 'admin' role via privileged client (Secure direct lookup)
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
        message: 'Access Denied: You do not have administrative privileges.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // EXECUTION
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin, mailboxNumber } = body;

    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    
    // Create Auth User
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;

    const userId = newUser.user.id;
    
    // Initialize Profile & Role
    // If mailboxNumber is provided, use it; otherwise generate a random one.
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

    return NextResponse.json({ success: true, uid: userId, mailboxNumber: finalMailboxNumber });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL:`, error.message);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
