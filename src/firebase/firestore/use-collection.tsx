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

    // Access the internal _query property, which is common for both CollectionReference and Query.
    const internalQuery = target._query;
    if (internalQuery && internalQuery.path && internalQuery.path.segments) {
      const path = internalQuery.path.segments.join('/');
      // If segments are empty, it might be a collectionGroup query.
      if (path === '' && (target.type === 'collectionGroup' || (internalQuery.collectionGroup && target.type === 'query'))) {
          const collectionId = internalQuery.collectionGroup || target.collectionGroup;
          if (collectionId) {
              return `**/${collectionId}`;
          }
          return '(root)'; // Should not happen with valid collection groups
      }
      return path;
    }

    // Fallback for CollectionReference which has a direct 'path' property.
    if (target.path && typeof target.path === 'string') {
      return target.path;
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
    // STOP ROOT LIST QUERIES FOREVER
    if (
      !memoizedTargetRefOrQuery ||
      typeof memoizedTargetRefOrQuery !== 'object'
    ) {
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
