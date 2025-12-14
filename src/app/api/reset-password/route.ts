import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length > 0) {
    return { auth: getAuth(), firestore: getFirestore() };
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase admin credentials are not set in environment variables.');
  }

  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  return { auth: getAuth(app), firestore: getFirestore(app) };
}

export async function POST(request: Request) {
    try {
        const { auth, firestore } = initAdmin();
        const { userId, newPassword } = await request.json();

        // 1. Verify Authorization Header
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];

        // 2. Verify the ID Token
        const decodedToken = await auth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // 3. Check if the authenticated user is an admin
        const adminRoleDoc = await firestore.collection('roles_admin').doc(adminUid).get();
        if (!adminRoleDoc.exists) {
            return NextResponse.json({ message: 'Forbidden: Caller is not an admin.' }, { status: 403 });
        }
        
        // 4. Validate input
        if (!userId || !newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid input: userId and a valid newPassword (min 6 chars) are required.' }, { status: 400 });
        }

        // 5. Update user's password
        await auth.updateUser(userId, {
            password: newPassword,
        });

        return NextResponse.json({ message: 'Password has been reset successfully.' });

    } catch (error: any) {
        console.error('API Error: reset-password:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Authentication error. Please sign in again.' }, { status: 401 });
        }
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}
