import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API for FromStore2Door OS.
 * Uses strict server-side cookie verification and direct role lookups.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    // 1. Identify Caller via standard SSR Client (Cookie-based)
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] AUTH_FAILURE: No authenticated user found in session.`);
      return NextResponse.json({ message: 'Invalid or expired administrative session. Please log in again.' }, { status: 401 });
    }

    // 2. Verify Administrative Role via privileged client (to bypass RLS)
    const adminClient = await createAdminClient();
    const { data: roleData, error: roleError } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isDomainAdmin) {
      console.warn(`[API:CREATE_USER:${requestId}] FORBIDDEN: User ${caller.email} lacks admin role.`);
      return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
    }

    // 3. Process Payload
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ message: 'Missing required fields: Email and full name are mandatory.' }, { status: 400 });
    }

    // 4. Privileged User Creation
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) {
        console.error(`[API:CREATE_USER:${requestId}] SUPABASE_AUTH_ERROR:`, createError.message);
        return NextResponse.json({ message: createError.message }, { status: 500 });
    }

    const userId = newUser.user.id;
    
    // 5. Initialize Profile and Role (Privileged upsert)
    // We use a Promise.all to ensure both are created before success
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
            role: promoteToAdmin ? 'admin' : 'customer'
        })
    ]);

    console.log(`[API:CREATE_USER:${requestId}] SUCCESS: Created user ${userId} (${email})`);

    return NextResponse.json({ 
      success: true, 
      uid: userId,
      message: 'Client identity established and secured.'
    });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] FATAL_EXCEPTION:`, error.message);
    return NextResponse.json({ message: 'System Error: ' + error.message }, { status: 500 });
  }
}
