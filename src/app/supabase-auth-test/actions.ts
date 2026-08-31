
'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Server Actions for Supabase Auth Testing.
 * Hardened with development-only guards for privileged operations.
 */

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) return { error: error.message };
  revalidatePath('/supabase-auth-test');
  return { success: true, user: data.user };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };
  revalidatePath('/supabase-auth-test');
  return { success: true, user: data.user };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/supabase-auth-test');
}

export async function resetPassword(email: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/supabase-auth-test/reset-password`,
    });
    if (error) return { error: error.message };
    return { success: true };
}

/**
 * PRIVILEGED OPERATION: Promotes a user to admin for testing purposes.
 * USES SUPABASE_SECRET_KEY.
 * GUARDED: Only functional in development environment.
 */
export async function promoteToAdmin(userId: string) {
    // 1. Strict Environment Guard
    if (process.env.NODE_ENV === 'production') {
        return { error: 'Administrative promotion tool is disabled in production for security.' };
    }

    const supabaseAdmin = await createAdminClient();
    
    // Check if role already exists
    const { data: existing } = await supabaseAdmin
        .from('app_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

    if (existing) return { success: true, message: 'User is already an admin.' };

    const { error } = await supabaseAdmin
        .from('app_roles')
        .insert({ user_id: userId, role: 'admin' });

    if (error) return { error: error.message };
    revalidatePath('/supabase-auth-test');
    return { success: true };
}
