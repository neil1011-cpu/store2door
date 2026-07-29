
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Hardened Firebase Admin SDK initialization.
 * Optimized for stable performance in Next.js 15 and workstation environments.
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

// Initialize app once at module level
const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Robust utility to recursively strip undefined values and ensure non-null types.
 * Prevents Firestore "payload argument" errors while preserving internal sentinels.
 */
export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // CRITICAL: Do NOT traverse internal Firestore types (sentinels)
  // We check for common internal markers used by the Admin SDK.
  const isFieldValue = 
    obj.constructor?.name === 'FieldValue' || 
    typeof obj._methodName === 'string' || 
    (obj.prototype && obj.prototype.constructor.name === 'FieldValue');

  if (isFieldValue) return obj;

  // Handle Dates
  if (obj instanceof Date) return obj;

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v)).filter(v => v !== undefined);
  }

  // Handle Plain Objects
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Only include defined values to prevent "payload argument" errors
      if (value !== undefined) {
        result[key] = cleanPayload(value);
      }
    }
  }
  
  return result;
}
