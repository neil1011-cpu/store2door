import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * In Firebase Studio (Workstation), we initialize without parameters 
 * to allow the SDK to pick up the workstation's default credentials.
 */

if (!admin.apps.length) {
  admin.initializeApp();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();