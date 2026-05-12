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
      return target.path;
    }

    return (target as unknown as InternalQuery)
      ._query
      .path
      .canonicalString();
  } catch {
    return '';
  }
}

function isInvalidFirestorePath(path: string): boolean {
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
  // CRITICAL: Initialize in loading state if a query is provided
  const [isLoading, setIsLoading] = useState<boolean>(
    !!memoizedTargetRefOrQuery
  );
  const [error, setError] = useState<FirestoreError | Error | null>(
    null
  );

  if (
    memoizedTargetRefOrQuery &&
    !memoizedTargetRefOrQuery.__memo
  ) {
    throw new Error(
      'Firestore query was not memoized using useMemoFirebase'
    );
  }

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const path = getFirestorePath(
      memoizedTargetRefOrQuery
    );

    if (isInvalidFirestorePath(path)) {
      const pathError = new Error(
        `Invalid Firestore query path: "${path}". Likely undefined or empty collection path upstream.`
      );

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
        console.error(
          '[Firestore] Snapshot error:',
          err
        );

        const contextualError =
          new FirestorePermissionError({
            operation: 'list',
            path,
          });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit(
          'permission-error',
          contextualError
        );
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return {
    data,
    isLoading,
    error,
  };
}