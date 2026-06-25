'use client';

import { useFirebase } from '../provider';
import type { User } from 'firebase/auth';

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 */
export function useUser(): UserHookResult {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
}
