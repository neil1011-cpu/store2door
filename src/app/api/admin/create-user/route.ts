import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      trn,
      mailboxNumber,
      defaultPassword,
    } = await request.json();

    // 1. Auth check
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // 2. Admin role check
    // We allow admin@neilussolutions.com to bypass the role document check for initial setup
    const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
    const adminRoleDoc = await adminDb
      .collection('admin_roles')
      .doc(decodedToken.uid)
      .get();

    if (!adminRoleDoc.exists && !isAdminEmail) {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

    // 3. Create Firebase Auth user
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email?.trim().toLowerCase(),
            password: defaultPassword,
            displayName: `${firstName} ${lastName}`,
        });
    } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
            // If user already exists in Auth, we try to fetch them to ensure Firestore is synced
            userRecord = await adminAuth.getUserByEmail(email.trim().toLowerCase());
        } else {
            throw authError;
        }
    }

    // 4. Mailbox generation
    const mailbox =
      mailboxNumber ||
      `FSTD${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Firestore user profile
    await adminDb.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: email?.trim().toLowerCase(),
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
    }, { merge: true });

    return NextResponse.json({
      message: 'User created successfully',
      uid: userRecord.uid,
      mailbox,
    });

  } catch (error: any) {
    console.error('API Error: create-user:', error);

    return NextResponse.json(
      { message: error.message || 'User creation failed' },
      { status: 500 }
    );
  }
}