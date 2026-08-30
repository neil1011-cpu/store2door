import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Hardened Firebase Admin SDK initialization for Store2Door.
 * Explicitly locked to production project: swiftroute-3230b.
 */

const PROJECT_ID = 'swiftroute-3230b';

function getAdminApp(): App {
  const apps = getApps();
  const existingApp = apps.find(a => a.options.projectId === PROJECT_ID);
  if (existingApp) {
    return existingApp;
  }
  
  return initializeApp({
    projectId: PROJECT_ID,
  });
}

const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminField = FieldValue;

export function cleanPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return obj;

  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v)).filter(v => v !== undefined);
  }

  try {
      const proto = Object.getPrototypeOf(obj);
      if (proto !== null && proto !== Object.prototype) {
        return obj;
      }
  } catch (e) {
      return obj;
  }

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