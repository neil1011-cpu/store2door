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
  const firebase = useFirebase();
  
  if (!firebase) {
    return { user: null, isUserLoading: true, userError: null };
  }
  
  return { 
    user: firebase.user, 
    isUserLoading: firebase.isUserLoading, 
    userError: firebase.userError 
  };
}
