import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * Force-initialized with the project ID to resolve token fetch failures 
 * in the workstation and App Hosting environments.
 */

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'swiftroute-3230b'
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
