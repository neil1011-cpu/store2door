import * as admin from 'firebase-admin';

/**
 * @fileOverview Centralized and hardened Firebase Admin SDK initialization.
 * Optimized for stable performance in Next.js and high-concurrency administrative tasks.
 */

const PROJECT_ID = 'swiftroute-3230b';

/**
 * Ensures the Admin SDK is initialized only once and returns the service instances.
 */
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  return admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

const app = getAdminApp();

// Export pre-initialized services using the official getters from the app instance
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export const adminField = admin.firestore.FieldValue;

/**
 * Utility to strip undefined values from an object to prevent Firestore "payload argument" errors.
 */
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}
