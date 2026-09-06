
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Administrative User Creation API for Supabase.
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
    
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin && caller.email !== 'admin@neilussolutions.com') {
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

    // 2. Profile and Role are created automatically by the DB trigger 'on_auth_user_created'
    // but we might need to update TRN/Phone since they aren't in Auth metadata defaults
    await supabase.from('profiles').update({ phone, trn }).eq('id', newUser.user.id);

    if (promoteToAdmin) {
        await supabase.rpc('manage_user_role', { target_user_id: newUser.user.id, new_role: 'admin' });
    }

    return NextResponse.json({ success: true, uid: newUser.user.id });

  } catch (error: any) {
    console.error('[API: CREATE-USER ERROR]', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
