import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Proactively hardened Firebase Admin SDK initialization.
 * Optimized for stable performance across all Next.js 15 environments.
 */

// SYNCHRONIZED PROJECT ID: Essential for administrative functions to target the active environment.
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'studio-5132922026';

function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  
  console.log('[ADMIN SDK] Initializing primary application instance for:', PROJECT_ID);
  
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
  app = initializeApp({ projectId: PROJECT_ID }, 'fallback-' + Date.now());
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

  // Identify if this is a plain object or a Firestore sentinel (like FieldValue)
  try {
      const proto = Object.getPrototypeOf(obj);
      if (proto !== null && proto !== Object.prototype) {
        return obj;
      }
  } catch (e) {
      return obj;
  }

  // Handle Plain Objects
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        result[key] = cleanPayload(value);
      }
    }
  }
  
  return result;
}
