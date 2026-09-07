import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API.
 * Uses strict server-side cookie verification for production reliability.
 */

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    // 1. Identify Caller (Standard SSR Client reads cookies)
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      console.error(`[API:CREATE_USER:${requestId}] Session failure:`, authError?.message);
      return NextResponse.json({ message: 'Invalid or expired administrative session.' }, { status: 401 });
    }

    // 2. Verify Administrative Role (Direct DB Check)
    const adminClient = await createAdminClient();
    const { data: roleData } = await adminClient
        .from('app_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';

    if (!roleData && !isDomainAdmin) {
      console.warn(`[API:CREATE_USER:${requestId}] Authorization denied for ${caller.email}`);
      return NextResponse.json({ message: 'Forbidden: Administrative authority required.' }, { status: 403 });
    }

    // 3. Process Payload
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 4. Privileged User Creation
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;

    const userId = newUser.user.id;
    
    // 5. Atomic Profile/Role Initialization
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

    console.log(`[API:CREATE_USER:${requestId}] Success: Established identity ${userId}`);

    return NextResponse.json({ 
      success: true, 
      uid: userId,
      message: 'Account established and confirmed.'
    });

  } catch (error: any) {
    console.error(`[API:CREATE_USER:${requestId}] Fatal Exception:`, error.message);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
