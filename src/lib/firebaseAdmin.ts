import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * Force-initialized with the project ID to resolve token fetch failures 
 * in the workstation environment.
 */

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'swiftroute-3230b'
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
