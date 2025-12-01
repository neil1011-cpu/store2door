
import { initializeApp, getApps, App, cert, getApp } from 'firebase-admin/app';

// IMPORTANT: Do not expose this file or these credentials to the client-side.
// This is a server-only file.

export function initAdminApp(): App {
  if (getApps().length > 0) {
    // In a serverless environment like Vercel or Firebase Functions,
    // the app might persist across invocations. Return the existing app.
    return getApp();
  }

  // This is the recommended way to initialize in a serverless environment.
  // It automatically uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // if it's set (which it should be in your hosting environment).
  // No need to manually parse JSON from env vars.
  return initializeApp();
}
