'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/** Safely extract a Firestore path from a ref/query */
function safeGetPath(target: any): string {
  try {
    if (!target) return 'unknown_path';

    // For a CollectionReference or a simple Query, the path is directly available.
    if (target.path && typeof target.path === 'string') {
      return target.path;
    }

    // For more complex queries, the path might be on an internal _query object.
    // This is accessing internal properties and might break, but it's a common fallback.
    // The `_query.path.segments.join('/')` is often more reliable than `canonicalString`.
    if (target._query?.path?.segments) {
      const path = target._query.path.segments.join('/');
      if (path) return path;
    }
    
    // A different internal structure might be used by some queries.
    if (target.converter === null && target._query) {
        if(target._query.path) {
            return target._query.path.segments.join('/');
        }
    }

    return 'unknown_path';
  } catch (e) {
    console.error("Error getting path from Firestore query/reference:", e);
    return 'unknown_path';
  }
}


export function useCollection<T = any>(
  memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Not ready → no query → do NOT call Firestore
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (fsError: FirestoreError) => {
        const path = safeGetPath(memoizedTargetRefOrQuery);

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
