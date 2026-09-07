import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API.
 * Uses Direct Role Check and Double-Verification for reliability in production.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  console.log(`[API:${requestId}] Starting Create User request`);

  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    
    // 1. Session Discovery
    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('cookie');
    
    console.log(`[API:${requestId}] Headers: authPresent=${!!authHeader}, cookiePresent=${!!cookieHeader}`);

    // Try cookie-based discovery first
    let { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    // Fallback: If cookie check fails or errors, verify the JWT from Authorization header
    if (!caller && authHeader?.startsWith('Bearer ')) {
      console.log(`[API:${requestId}] Attempting header verification fallback...`);
      const token = authHeader.split(' ')[1];
      const { data: { user: headerUser }, error: headerError } = await adminClient.auth.getUser(token);
      if (headerError) {
          console.error(`[API:${requestId}] Header verification failed:`, headerError.message);
      } else {
          caller = headerUser;
          console.log(`[API:${requestId}] Header verification success: ${caller?.email}`);
      }
    }

    if (!caller) {
      console.error(`[API:${requestId}] Verification failed: No valid session detected.`);
      return NextResponse.json({ message: 'Invalid or expired administrative session.' }, { status: 401 });
    }

    // 2. Direct Role Verification using Admin Client
    // We check the table directly to avoid RPC context synchronization issues
    const { data: roleData, error: roleError } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';
    
    console.log(`[API:${requestId}] Auth: userId=${caller.id}, roleFound=${!!roleData}, isDomainAdmin=${isDomainAdmin}`);

    if (!roleData && !isDomainAdmin) {
      console.warn(`[API:${requestId}] Authorization denied for ${caller.email}`);
      return NextResponse.json({ message: 'Forbidden: Administrative authority required.' }, { status: 403 });
    }

    // 3. Validate Payload
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    console.log(`[API:${requestId}] Payload validated for target: ${email}`);

    // 4. Create User (Privileged)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) {
        console.error(`[API:${requestId}] Supabase Auth creation error:`, createError.message);
        throw createError;
    }

    const userId = newUser.user.id;
    console.log(`[API:${requestId}] Auth identity established: ${userId}`);
    
    // 5. Initialize Profile & Role (Using Admin Client to bypass RLS)
    const profileResult = await adminClient.from('profiles').upsert({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}`
    });

    if (profileResult.error) {
        console.error(`[API:${requestId}] Profile initialization error:`, profileResult.error.message);
    }

    const roleResult = await adminClient.from('app_roles').upsert({
        user_id: userId,
        role: promoteToAdmin ? 'admin' : 'customer'
    });

    if (roleResult.error) {
        console.error(`[API:${requestId}] Role assignment error:`, roleResult.error.message);
    }

    console.log(`[API:${requestId}] Operation successful for ${userId}`);

    return NextResponse.json({ 
      success: true, 
      uid: userId,
      message: 'Account established and confirmed.'
    });

  } catch (error: any) {
    console.error(`[API:${requestId}] FATAL EXCEPTION:`, error.message);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
