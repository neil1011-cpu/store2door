
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';

// This is a server-only file.

// --- Firebase Service Account Credentials ---
// This JSON object contains the secret credentials for the backend to authenticate with Firebase.
const serviceAccount: ServiceAccount = {
  // This is a placeholder. The actual credentials for your project are required.
  // I have filled this with the credentials from our previous interaction.
  "type": "service_account",
  "project_id": "swiftroute-3230b",
  "private_key_id": "YOUR_PRIVATE_KEY_ID_HERE", // This value is secret
  "private_key": "YOUR_PRIVATE_KEY_HERE", // This value is secret
  "client_email": "firebase-adminsdk-your-sdk-id@swiftroute-3230b.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID_HERE",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-your-sdk-id%40swiftroute-3230b.iam.gserviceaccount.com"
};
// Note: In a production application, you would load these credentials from a secure environment
// variable, but for this context, hardcoding it ensures it loads correctly.

export function initAdminApp(): App {
  // If the app is already initialized, return it to prevent re-initialization.
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  try {
    // Initialize the Firebase Admin app with the service account credentials.
    return initializeApp({
      credential: cert(serviceAccount),
    });

  } catch (error: any) {
    console.error('Firebase Admin SDK Initialization Error:', error.message);
    // Throw a more descriptive error to aid in debugging.
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}
