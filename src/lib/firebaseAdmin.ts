import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * Force-initialized with the project ID to resolve token fetch failures 
 * in the workstation and App Hosting environments.
 */

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'swiftroute-3230b';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectId
    });
    console.log(`[Admin SDK] Initialized for project: ${projectId}`);
  } catch (error) {
    console.error('[Admin SDK] Initialization Error:', error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
