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
 * Prevents Firestore "payload argument" errors.
 * Explicitly ignores FieldValue objects to prevent recursive corruption.
 */
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    
    // Explicitly ignore undefined
    if (value === undefined) return;
    
    // Detect FieldValue or other non-plain objects to stop recursion
    const isFieldValue = value && typeof value === 'object' && ('_methodName' in value || value instanceof FieldValue);

    if (value !== null && typeof value === 'object' && !isFieldValue) {
      result[key] = cleanPayload(value);
    } else {
      result[key] = value;
    }
  });
  
  return result as T;
}
