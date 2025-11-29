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

    // CollectionReference has .path
    if ('path' in target) {
      return target.path || 'unknown_path';
    }

    // Query has internal _query → path
    if (target._query?.path?.canonicalString) {
      return target._query.path.canonicalString() || 'unknown_path';
    }

    return 'unknown_path';
  } catch {
    return 'unknown_path';
  }
}

/** Prevents invalid or root queries */
function isValidRefOrQuery(target: any): boolean {
  if (!target) return false;

  // Must be one of the Firestore types we expect
  const isCollection = !!(target as CollectionReference).id;
  const isQuery = !!(target as Query).type === undefined || 'firestore' in target;

  if (!isCollection && !isQuery) return false;

  // Block accidental root access
  if ('path' in target && target.path === '') return false;

  return true;
}

export function useCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {
    __memo?: boolean;
  }) | null | undefined
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

    // Prevent illegal or root queries
    if (!isValidRefOrQuery(memoizedTargetRefOrQuery)) {
      const path = safeGetPath(memoizedTargetRefOrQuery);
      const contextualError = new FirestorePermissionError({
        operation: 'list',
        path,
      });

      setError(contextualError);
      setIsLoading(false);
      setData(null);
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
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(
      'useCollection received a non-memoized query. Wrap your query in useMemoFirebase.'
    );
  }

  return { data, isLoading, error };
}
