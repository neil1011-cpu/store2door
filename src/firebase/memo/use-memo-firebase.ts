'use client';

import { useMemo, type DependencyList } from 'react';

export type MemoFirebase<T> = T & { __memo?: boolean };

/**
 * Stabilizes Firestore references and queries to prevent infinite render loops.
 * Adds a internal flag to verify memoization in data hooks.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
