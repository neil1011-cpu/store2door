import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Hardened Firebase Admin SDK initialization for Store2Door.
 * Explicitly locked to production project: swiftroute-3230b.
 */

const PROJECT_ID = 'swiftroute-3230b';

function getAdminApp(): App {
  const apps = getApps();
  // Filter for an app that matches our specific production project ID
  const existingApp = apps.find(a => a.options.projectId === PROJECT_ID);
  if (existingApp) {
    return existingApp;
  }
  
  // Initialize with explicit Project ID to prevent drift in App Hosting environments
  return initializeApp({
    projectId: PROJECT_ID,
  }, `app-${Date.now()}`);
}

// Initialize app once at module level with safety checks
const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

/**
 * Robust utility to recursively strip undefined values and ensure non-null types.
 * Prevents Firestore "payload argument" errors by identifying plain objects vs sentinels.
 */
export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // Handle Dates & Timestamps
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
