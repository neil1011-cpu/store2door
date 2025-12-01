
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// IMPORTANT: Do not expose this file or these credentials to the client-side.
// This is a server-only file.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

function getAdminApp(): App {
  if (getApps().length > 0) {
    // In a serverless environment, the app might persist across invocations.
    return getApps()[0];
  }
  
  // This is the recommended way to initialize in a serverless environment like Next.js API routes.
  // It uses the GOOGLE_APPLICATION_CREDENTIALS env var if available,
  // otherwise it can use the service account details.
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
  });
}

export function initAdminApp() {
  getAdminApp();
}
