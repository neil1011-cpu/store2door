import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API.
 * Uses a two-step verification to ensure caller has admin rights before using the Admin SDK.
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Verify Caller identity and role using a standard client (honors RLS/auth context)
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 });
    }

    // 2. Check for Admin privileges (Domain bypass or database role)
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';
    
    if (!isAdmin && !isDomainAdmin) {
      return NextResponse.json({ message: 'Forbidden: Administrative authority required.' }, { status: 403 });
    }

    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = await request.json();

    // 3. Perform privileged creation using the Admin Client
    const adminClient = await createAdminClient();
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12),
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;

    // 4. Initialize Profile and Role
    const userId = newUser.user.id;
    
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
        role: promoteToAdmin ? 'admin' : 'customer'
    });

    return NextResponse.json({ success: true, uid: userId });

  } catch (error: any) {
    console.error('[API: CREATE-USER ERROR]', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred during user creation.' }, { status: 500 });
  }
}