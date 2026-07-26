import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

// Export pre-initialized services using modular SDK getters
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Utility to recursively strip undefined values from an object to prevent Firestore "payload argument" errors.
 */
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined) return;
    
    if (value !== null && typeof value === 'object' && !(value instanceof FieldValue)) {
      result[key] = cleanPayload(value);
    } else {
      result[key] = value;
    }
  });
  
  return result as T;
}
