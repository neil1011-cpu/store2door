'use client';

import { useFirebase } from '../provider';
import type { Firestore } from 'firebase/firestore';

/**
 * Hook to access the initialized Firestore instance.
 * Returns null if Firestore is not yet available.
 */
export function useFirestore(): Firestore | null {
  const firebase = useFirebase();
  return firebase?.firestore || null;
}
