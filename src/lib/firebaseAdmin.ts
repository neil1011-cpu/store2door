import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Hardened Firebase Admin SDK initialization.
 * Optimized for stable performance in Next.js 15 and workstation environments.
 * Uses hardcoded project ID as a final fallback to ensure reliability in live environments.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'swiftroute-3230b';

function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  
  // Initialize with the detected or hardcoded Project ID
  return initializeApp({
    projectId: PROJECT_ID,
  });
}

// Initialize app once at module level with safety checks
let app: App;
try {
  app = getAdminApp();
} catch (e: any) {
  console.error('[ADMIN SDK] Initialization Error:', e.message);
  // Fallback initialization if first attempt fails
  app = initializeApp({ projectId: PROJECT_ID }, 'fallback');
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Robust utility to recursively strip undefined values and ensure non-null types.
 * Prevents Firestore "payload argument" errors by identifying plain objects vs sentinels.
 */
export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // Handle Dates
  if (obj instanceof Date) return obj;

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v)).filter(v => v !== undefined);
  }

  // CRITICAL: Identify if this is a plain object or a class/sentinel
  // Plain objects have Object.prototype or null as their prototype.
  try {
      const proto = Object.getPrototypeOf(obj);
      if (proto !== null && proto !== Object.prototype) {
        // This is an internal type (like FieldValue or DocumentReference), return as-is
        return obj;
      }
  } catch (e) {
      // If prototype check fails, assume it's an internal complex object and return
      return obj;
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
