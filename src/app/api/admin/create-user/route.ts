import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API.
 * Uses strict session verification before performing privileged Auth/DB operations.
 */

export async function POST(request: Request) {
  try {
    // 1. Verify Caller Identity via Standard Client (Cookie-based)
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !caller) {
      return NextResponse.json({ message: 'Invalid or expired administrative session.' }, { status: 401 });
    }

    // 2. Check for Admin privileges (RPC + Master Email Fallback)
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';
    
    if (!isAdmin && !isDomainAdmin) {
      return NextResponse.json({ message: 'Forbidden: Administrative authority required.' }, { status: 403 });
    }

    // 3. Validate Payload
    const body = await request.json();
    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ message: 'Missing required fields: email, firstName, lastName.' }, { status: 400 });
    }

    // 4. Perform Privileged Creation using Admin SDK
    const adminClient = await createAdminClient();
    
    // Generate a temporary secure password (user will reset via forgot password)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-verify for production continuity
        user_metadata: { 
          full_name: `${firstName} ${lastName}`,
          created_by: caller.id
        }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
      }
      throw createError;
    }

    const userId = newUser.user.id;
    
    // 5. Initialize Profile
    // Using upsert to be safe, though ID should be unique
    const { error: profileError } = await adminClient.from('profiles').upsert({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}`
    });

    if (profileError) {
      console.error('[API: CREATE-USER] Profile Sync Error:', profileError);
      // We don't delete the auth user here to allow manual recovery/retry in admin dashboard
    }

    // 6. Assign Initial Role
    const { error: roleError } = await adminClient.from('app_roles').upsert({
        user_id: userId,
        role: promoteToAdmin ? 'admin' : 'customer'
    });

    if (roleError) {
      console.error('[API: CREATE-USER] Role Assignment Error:', roleError);
    }

    // 7. Audit Log
    await adminClient.from('system_logs').insert({
        log_type: 'admin_user_created',
        description: `Admin ${caller.email} created new account: ${email} (${promoteToAdmin ? 'Admin' : 'Customer'})`,
        actor_id: caller.id,
        metadata: { target_uid: userId, email }
    });

    return NextResponse.json({ 
      success: true, 
      uid: userId,
      message: 'Account established and confirmed in global registry.'
    });

  } catch (error: any) {
    console.error('[API: CREATE-USER FATAL]', error);
    return NextResponse.json({ 
      message: error.message || 'A system error occurred during user provisioning.' 
    }, { status: 500 });
  }
}
