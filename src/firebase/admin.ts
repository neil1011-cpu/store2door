
import admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK.
// It checks if the app is already initialized to prevent errors.
export function initAdminApp() {
  if (admin.apps.length > 0) {
    return {
      firestore: admin.firestore(),
      auth: admin.auth(),
    };
  }

  // If the service account key is not set in environment variables,
  // the SDK will attempt to find default credentials.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
  });

  return {
    firestore: admin.firestore(),
    auth: admin.auth(),
  };
}
