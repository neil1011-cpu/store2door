'use client';

import { useFirebase } from '../provider';
import type { Auth } from 'firebase/auth';

/**
 * Hook to access the initialized Firebase Auth instance.
 */
export function useAuth(): Auth {
  const { auth } = useFirebase();
  return auth;
}
