import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * Uses explicit Project ID to avoid audience mismatch errors in the Firebase Studio environment.
 */

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'swiftroute-3230b',
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
