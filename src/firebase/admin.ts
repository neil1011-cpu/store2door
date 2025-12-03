
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';

// IMPORTANT: Do not expose this file or these credentials to the client-side.
// This is a server-only file.

export function initAdminApp(): App {
  // If the apps are already initialized, return the existing app.
  // This is crucial for serverless environments where functions can be reused.
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    throw new Error('Could not initialize Firebase Admin SDK. Please check your service account credentials.');
  }
}
