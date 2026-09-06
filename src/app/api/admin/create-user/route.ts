import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API for Supabase.
 * Optimized for robustness with upsert logic.
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization required.' }, { status: 401 });
    }

    const supabase = await createAdminClient();
    
    // Verify Caller is Admin
    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (!caller) return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
    
    // Domain Admin bypass or RPC check
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const isDomainAdmin = caller.email === 'admin@neilussolutions.com';
    
    if (!isAdmin && !isDomainAdmin) {
        return NextResponse.json({ message: 'Admin access denied' }, { status: 403 });
    }

    const { firstName, lastName, email, phone, trn, isAdmin: promoteToAdmin } = await request.json();

    // 1. Create Supabase Auth User
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12), // Temporary random password
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}` }
    });

    if (authError) throw authError;

    // 2. Profile Creation (Robust Upsert)
    // We use upsert to ensure the profile exists even if the DB trigger failed
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUser.user.id,
        full_name: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        trn: trn || null,
        mailbox_number: `FSTD${Math.floor(1000 + Math.random() * 9000)}` // Fallback mailbox if trigger fails
    });

    if (profileError) {
        console.warn('[API: CREATE-USER] Profile upsert issue:', profileError.message);
    }

    // 3. Assign Role
    const roleToAssign = promoteToAdmin ? 'admin' : 'customer';
    const { error: roleError } = await supabase.from('app_roles').upsert({
        user_id: newUser.user.id,
        role: roleToAssign
    }, { onConflict: 'user_id, role' });

    if (roleError) {
        console.error('[API: CREATE-USER] Role assignment failed:', roleError.message);
    }

    return NextResponse.json({ success: true, uid: newUser.user.id });

  } catch (error: any) {
    console.error('[API: CREATE-USER ERROR]', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
