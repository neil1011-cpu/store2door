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
        { message: 'Unauthorized: Missing token' },
        { status: 401 }
      );
    }

    const idToken = authorization.split('Bearer ')[1];
    
    // The verifyIdToken call will now succeed because the Admin SDK is initialized with the correct Project ID.
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // 2. Admin role check
    const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
    const adminRoleDoc = await adminDb
      .collection('admin_roles')
      .doc(decodedToken.uid)
      .get();

    if (!adminRoleDoc.exists && !isAdminEmail) {
      return NextResponse.json(
        { message: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      );
    }

    // 3. Create/Sync Firebase Auth user
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email?.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`,
        });
    } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
            userRecord = await adminAuth.getUserByEmail(email.trim().toLowerCase());
        } else {
            throw authError;
        }
    }

    // 4. Mailbox identification
    const mailbox = mailboxNumber || `FSTD${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Build Firestore Profile
    await adminDb.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: email?.trim().toLowerCase(),
      phone,
      trn: trn || 'N/A',
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
      message: 'User synchronized successfully',
      uid: userRecord.uid,
      mailbox,
    });

  } catch (error: any) {
    console.error('Migration API Error:', error);
    return NextResponse.json(
      { message: error.message || 'User creation failed' },
      { status: 500 }
    );
  }
}
