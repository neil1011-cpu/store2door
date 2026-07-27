
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
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
  // We use the projectId directly which works in most Firebase/Google Cloud environments
  return initializeApp({
    projectId: PROJECT_ID,
  });
}

// Initialize app once at module level, but handle potential errors
let app: App;
try {
    app = getAdminApp();
} catch (e) {
    console.error('[Firebase Admin] Initialization failed:', e);
    throw e;
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Robust utility to recursively strip undefined values and ensure non-null types.
 * Prevents Firestore "payload argument" errors while preserving internal sentinels.
 */
export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // CRITICAL: Do NOT clone or traverse internal Firestore types (sentinels)
  // These objects often contain private state or cycles.
  const isFieldValue = 
    obj.constructor?.name === 'FieldValue' || 
    obj._methodName !== undefined || 
    obj instanceof adminField;

  if (isFieldValue) return obj;

  // Handle Dates (Firestore Admin handles these natively)
  if (obj instanceof Date) return obj;

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v));
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
