import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Verified User Creation API.
 * Uses Direct Role Discovery to bypass RPC synchronization lag.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const supabase = await createClient();
    
    // 1. AUTHENTICATION: Check for cookie-based session
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] NO_SESSION:`, authError?.message);
      return NextResponse.json({ 
        message: 'Administrative session not found. Please refresh and log in again.',
        code: 'UNAUTHENTICATED'
      }, { status: 401 });
    }

    // 2. AUTHORIZATION: Query database directly via Admin Client (RLS Bypass)
    const adminClient = await createAdminClient();
    
    const { data: roleData, error: roleError } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (roleError) {
      console.error(`[API:CREATE_USER:${requestId}] DB_QUERY_ERROR:`, roleError.message);
      return NextResponse.json({ 
        message: `Database connection error: ${roleError.message}. Table 'app_roles' may be missing or locked.`,
        code: roleError.code
      }, { status: 500 });
    }

    const isMasterAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isMasterAdmin) {
      console.warn(`[API:CREATE_USER:${requestId}] FORBIDDEN: User ${caller.id} is not an admin.`);
      return NextResponse.json({ 
        message: 'Access Denied: You do not have the required administrative role.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // 3. EXECUTION
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin } = body;

    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) {
        return NextResponse.json({ message: createError.message }, { status: 500 });
    }

    const userId = newUser.user.id;
    
    // Create Profile and Role
    await adminClient.from('profiles').upsert({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}`
    });

    await adminClient.from('app_roles').upsert({
        user_id: userId,
        role: isAdmin ? 'admin' : 'customer'
    });

    console.log(`[API:CREATE_USER:${requestId}] SUCCESS: User created with ID ${userId}`);
    return NextResponse.json({ success: true, uid: userId });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL_EXCEPTION:`, error.message);
    return NextResponse.json({ message: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
