import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API.
 * Uses Double-Verification (Cookies + Authorization Header) for reliability.
 */

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    
    // 1. Double-Verification: Check Cookies FIRST, then Header
    let { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    // Fallback: If cookie check fails, try verifying the JWT from Authorization header
    if (!caller) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user: headerUser } } = await adminClient.auth.getUser(token);
        caller = headerUser;
      }
    }

    if (!caller) {
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
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 4. Create User (Privileged)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (createError) throw createError;
    const userId = newUser.user.id;
    
    // 5. Initialize Profile & Role
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

    return NextResponse.json({ 
      success: true, 
      uid: userId,
      message: 'Account established and confirmed.'
    });

  } catch (error: any) {
    console.error('[API: CREATE-USER ERROR]', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
