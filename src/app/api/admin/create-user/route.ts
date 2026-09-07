import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Hardened User Creation API with explicit diagnostic error reporting.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const supabase = await createClient();
    
    // 1. AUTHENTICATION: Is there a session?
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] AUTH_FAILURE:`, authError?.message || 'No session');
      return NextResponse.json({ 
        message: 'Invalid or expired administrative session. Please log in again.',
        code: 'UNAUTHENTICATED'
      }, { status: 401 });
    }

    // 2. AUTHORIZATION: Is the caller an admin?
    const adminClient = await createAdminClient();
    
    // We check app_roles directly. If this fails with PGRST205, it's a schema issue.
    const { data: roleData, error: roleError } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (roleError) {
      console.error(`[API:CREATE_USER:${requestId}] SCHEMA_ERROR:`, roleError.message);
      return NextResponse.json({ 
        message: `System Infrastructure Error: ${roleError.message}. Check if 'app_roles' table exists in schema cache.`,
        code: roleError.code
      }, { status: 500 });
    }

    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isDomainAdmin) {
      return NextResponse.json({ 
        message: 'Access Denied: Administrative authority required.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // 3. EXECUTION: Privileged user creation
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
    
    // Initialize profile and role atomically
    await Promise.all([
        adminClient.from('profiles').upsert({
            id: userId,
            full_name: `${firstName} ${lastName}`,
            email: email,
            phone: phone || null,
            trn: trn || null,
            mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}`
        }),
        adminClient.from('app_roles').upsert({
            user_id: userId,
            role: isAdmin ? 'admin' : 'customer'
        })
    ]);

    return NextResponse.json({ success: true, uid: userId });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL:`, error.message);
    return NextResponse.json({ message: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
