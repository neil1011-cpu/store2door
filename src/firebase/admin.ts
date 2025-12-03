
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// IMPORTANT: Do not expose this file or these credentials to the client-side.
// This is a server-only file.

export function initAdminApp(): App {
  // If the apps are already initialized, return the existing app.
  // This is crucial for serverless environments where functions can be reused.
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // In a secure server environment (like Next.js API routes or Firebase Functions),
  // the Admin SDK automatically discovers the GOOGLE_APPLICATION_CREDENTIALS
  // environment variable if it's set. No manual parsing or passing of credentials is needed.
  // This is the most secure and reliable method.
  return initializeApp();
}
