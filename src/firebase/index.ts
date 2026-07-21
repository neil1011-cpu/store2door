'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { useFirebase } from './provider';

/**
 * Initializes the Firebase JS SDK.
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

// Core Providers
export * from './provider';
export * from './client-provider';

// Firestore Hooks
export * from './firestore/use-firestore';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

// Auth Hooks
export * from './auth/use-auth';
export * from './auth/use-user';

// Storage Hook
export function useStorage() {
  const firebase = useFirebase();
  return firebase?.storage || null;
}

// Utilities
export * from './memo/use-memo-firebase';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
