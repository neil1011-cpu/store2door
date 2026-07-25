import admin from 'firebase-admin';

/**
 * @fileOverview Centralized Firebase Admin SDK initialization.
 * Hardened to ensure stable initialization across API routes and environments.
 */

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'swiftroute-3230b';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectId,
      // In production/Firebase Hosting environments, credentials are automatically discovered.
    });
    console.log(`[Admin SDK] Successfully initialized for project: ${projectId}`);
  } catch (error) {
    console.error('[Admin SDK] Critical Initialization Failure:', error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminField = admin.firestore.FieldValue;
