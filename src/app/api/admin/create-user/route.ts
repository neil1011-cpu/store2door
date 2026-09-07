import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Hardened User Creation API with Deep Diagnostics.
 * Separates authentication, authorization, and execution with explicit logging.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  const headerList = await headers();
  const cookieHeader = headerList.get('cookie') || 'NONE';
  
  console.log(`[API:CREATE_USER:${requestId}] START - Cookie Header Present: ${cookieHeader !== 'NONE'}`);
  
  try {
    const supabase = await createClient();
    
    // 1. AUTHENTICATION: Retrieve the calling user from the cookie-based session
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] AUTH_FAILURE:`, {
        error: authError?.message,
        code: authError?.status,
        userPresent: !!caller
      });
      
      return NextResponse.json({ 
        message: 'Administrative session not found. Please refresh and log in again.',
        debug: {
          hasCookies: cookieHeader !== 'NONE',
          authError: authError?.message || 'No user found in session',
          requestId
        }
      }, { status: 401 });
    }

    console.log(`[API:CREATE_USER:${requestId}] AUTH_SUCCESS: ${caller.email} (${caller.id})`);

    // 2. AUTHORIZATION: Verify 'admin' role via privileged client
    const adminClient = await createAdminClient();
    
    // Check if the user has the 'admin' role in public.app_roles
    const { data: roleData, error: roleError } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (roleError) {
      console.error(`[API:CREATE_USER:${requestId}] ROLE_QUERY_ERROR:`, roleError.message);
      return NextResponse.json({ 
        message: `Database error during authorization: ${roleError.message}`,
        code: roleError.code
      }, { status: 500 });
    }

    const isMasterAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isMasterAdmin) {
      console.warn(`[API:CREATE_USER:${requestId}] FORBIDDEN: ${caller.email} lacks admin role.`);
      return NextResponse.json({ 
        message: 'Access Denied: You do not have administrative privileges.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // 3. VALIDATION & EXECUTION
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin } = body;

    if (!email || !firstName || !lastName) {
       return NextResponse.json({ message: 'Missing required user details.' }, { status: 400 });
    }

    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    
    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) {
        console.error(`[API:CREATE_USER:${requestId}] AUTH_CREATE_ERROR:`, createError.message);
        return NextResponse.json({ message: createError.message }, { status: 500 });
    }

    const userId = newUser.user.id;
    
    // Initialize Profile
    const { error: profileError } = await adminClient.from('profiles').upsert({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}`
    });

    if (profileError) {
        console.error(`[API:CREATE_USER:${requestId}] PROFILE_INIT_ERROR:`, profileError.message);
    }

    // Initialize Role
    await adminClient.from('app_roles').upsert({
        user_id: userId,
        role: isAdmin ? 'admin' : 'customer'
    });

    console.log(`[API:CREATE_USER:${requestId}] COMPLETED_SUCCESSFULLY: User ID ${userId}`);
    return NextResponse.json({ success: true, uid: userId });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL_EXCEPTION:`, error.message);
    return NextResponse.json({ message: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
