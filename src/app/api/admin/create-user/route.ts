
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
        const { firstName, lastName, email, phone, trn, mailboxNumber, defaultPassword } = await request.json();

        // 1. Verify Authorization Header (Ensure caller is an admin)
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        
        const adminRoleDoc = await firestore.collection('admin_roles').doc(decodedToken.uid).get();
        if (!adminRoleDoc.exists) {
            return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
        }

        // 2. Create Auth User
        const userRecord = await auth.createUser({
            email,
            password: defaultPassword,
            displayName: `${firstName} ${lastName}`,
        });

        // 3. Create Firestore Profile
        const mailbox = mailboxNumber || `FSTD${Math.floor(Math.random() * 9000) + 1000}`;
        const userProfile = {
            id: userRecord.uid,
            fullName: `${firstName} ${lastName}`,
            firstName,
            lastName,
            email,
            phone,
            trn,
            mailboxNumber: mailbox,
            address: {
                address1: '4350 NE 5th Terrace Bay #3',
                address2: `${mailbox}-FSTD`,
                city: 'Oakland Park',
                state: 'Florida',
                zip: '33334',
            },
            createdAt: FieldValue.serverTimestamp(),
            needsPasswordReset: true,
            pickupPersonnel: [],
            dropoffAddresses: [],
        };

        await firestore.collection('users').doc(userRecord.uid).set(userProfile);

        return NextResponse.json({ message: 'User created successfully', uid: userRecord.uid, mailbox });

    } catch (error: any) {
        console.error('API Error: create-user:', error);
        return NextResponse.json({ message: error.message || 'An error occurred during user creation.' }, { status: 500 });
    }
}
