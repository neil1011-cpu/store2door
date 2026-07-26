
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Hardened Firebase Admin SDK initialization.
 * Optimized for stable performance in Next.js 15.
 */

const PROJECT_ID = 'swiftroute-3230b';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    projectId: PROJECT_ID,
  });
}

const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Robust utility to recursively strip undefined values and ensure non-null types.
 * Prevents Firestore "payload argument" errors while preserving FieldValue objects.
 */
export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // Detect FieldValue or other internal Firestore types to stop recursion
  const isFieldValue = obj && (
    (obj.constructor && obj.constructor.name === 'FieldValue') || 
    (typeof obj._methodName === 'string')
  );

  if (isFieldValue) return obj;

  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v));
  }

  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = cleanPayload(value);
    }
  });
  
  return result;
}
