'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Server Actions for Hardened Auth/RBAC Testing.
 * Strictly limited to development environment.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export async function promoteToAdmin(userId: string) {
  if (!IS_DEV) return { error: 'Admin promotion restricted to development.' };

  const supabaseAdmin = await createAdminClient();
  
  const { error } = await supabaseAdmin
    .from('app_roles')
    .insert({ user_id: userId, role: 'admin' })
    .onConflict('user_id, role')
    .ignore();

  if (error) return { error: error.message };
  return { success: true };
}

export async function createTestUserB() {
  if (!IS_DEV) return { error: 'Test user creation restricted to development.' };

  const supabaseAdmin = await createAdminClient();
  const email = `test-b-${Date.now()}@fstd-test.com`;
  const password = 'TestPassword123!';

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Customer B' }
  });

  if (error) return { error: error.message };
  return { success: true, user: data.user };
}

export async function cleanupTestData(uids: string[]) {
  if (!IS_DEV) return { error: 'Cleanup restricted to development.' };
  
  const supabaseAdmin = await createAdminClient();
  
  for (const uid of uids) {
    await supabaseAdmin.auth.admin.deleteUser(uid);
    // Trigger cascades will clean up profiles/roles
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
