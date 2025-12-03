
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';

// This is a server-only file.

export function initAdminApp(): App {
  // If the app is already initialized, return it to prevent re-initialization.
  if (getApps().length) {
    return getApps()[0];
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for server-side operations.');
    }

    // Parse the service account JSON string into an object.
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    // Initialize the Firebase Admin app with the service account credentials.
    return initializeApp({
      credential: cert(serviceAccount),
    });

  } catch (error: any) {
    console.error('Firebase Admin SDK Initialization Error:', error.message);
    // Throw a more descriptive error to aid in debugging.
    throw new Error('Could not initialize Firebase Admin SDK. Please check your FIREBASE_SERVICE_ACCOUNT environment variable.');
  }
}
