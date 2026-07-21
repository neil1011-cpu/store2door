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

export type WithId<T> = T & {
  id: string;
};

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    };
  };
}

type FirestoreTarget =
  | ((CollectionReference<DocumentData> | Query<DocumentData>) & {
      __memo?: boolean;
    })
  | null
  | undefined;

function getFirestorePath(target: FirestoreTarget): string {
  if (!target) return '';

  try {
    if (target.type === 'collection') {
      return (target as CollectionReference).path;
    }

    const internal = target as unknown as InternalQuery;
    const path = internal._query?.path?.canonicalString?.() || internal._query?.path?.toString?.();
    
    if (!path && target.type === 'query') {
        return '(collection-group)';
    }

    return path || '';
  } catch {
    return '';
  }
}

function isInvalidFirestorePath(path: string, target: FirestoreTarget): boolean {
  if (target?.type === 'query' || path === '(collection-group)') return false;
  if (!path) return true;

  const normalized = path.trim();
  return (
    normalized === '' ||
    normalized === '/' ||
    normalized === 'documents' ||
    normalized === '/documents'
  );
}

export function useCollection<T = any>(
  memoizedTargetRefOrQuery: FirestoreTarget
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;

  const [data, setData] = useState<ResultItemType[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    !!memoizedTargetRefOrQuery
  );
  const [error, setError] = useState<FirestoreError | Error | null>(
    null
  );

  // Replaced throw with console.error to prevent fatal render crashes
  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    console.error('[Firebase] Firestore query was not memoized using useMemoFirebase. This can cause infinite re-renders.');
  }

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const path = getFirestorePath(memoizedTargetRefOrQuery);

    if (isInvalidFirestorePath(path, memoizedTargetRefOrQuery)) {
      const pathError = new Error(`Invalid Firestore query path: "${path}". Likely undefined or empty collection path upstream.`);
      setData(null);
      setError(pathError);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({
            ...(doc.data() as T),
            id: doc.id,
          });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error('[Firestore] Snapshot error:', err);
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path || 'collection-group-query',
        });
        setError(err || contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
