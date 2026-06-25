'use client';

import { useFirebase } from '../provider';
import type { Firestore } from 'firebase/firestore';

/**
 * Hook to access the initialized Firestore instance.
 */
export function useFirestore(): Firestore {
  const { firestore } = useFirebase();
  return firestore;
}
