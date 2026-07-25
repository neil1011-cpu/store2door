import admin from 'firebase-admin';

/**
 * @fileOverview Centralized and hardened Firebase Admin SDK initialization.
 * Optimized for stable performance in Next.js and high-concurrency administrative tasks.
 */

// Explicit project ID from config for reliability
const PROJECT_ID = 'swiftroute-3230b';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
    console.log(`[Admin SDK] Initialized for project: ${PROJECT_ID}`);
  } catch (error) {
    console.error('[Admin SDK] Initialization error:', error);
  }
}

// Export pre-initialized services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminField = admin.firestore.FieldValue;
