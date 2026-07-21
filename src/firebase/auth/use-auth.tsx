'use client';

import { useFirebase } from '../provider';
import type { Auth } from 'firebase/auth';

/**
 * Hook to access the initialized Firebase Auth instance.
 * Returns null if Auth is not yet available.
 */
export function useAuth(): Auth | null {
  const firebase = useFirebase();
  return firebase?.auth || null;
}
