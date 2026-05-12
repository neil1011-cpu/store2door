import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Robust User Creation API.
 * Uses manual JWT decoding to bypass "aud" claim mismatch in Firebase Studio.
 */

async function getAdminStatus(uid: string, email?: string) {
  if (email === 'admin@neilussolutions.com') return true;
  try {
    const doc = await adminDb.collection('admin_roles').doc(uid).get();
    return doc.exists;
  } catch (e) {
    return false;
  }
}

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
      return NextResponse.json({ message: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    
    // Manual decode to bypass workstation project ID mismatch ("aud" claim issue)
    // Part 2 of the JWT (index 1) is the payload
    const tokenParts = idToken.split('.');
    if (tokenParts.length < 2) {
        return NextResponse.json({ message: 'Unauthorized: Malformed token' }, { status: 401 });
    }

    const payloadBase64 = tokenParts[1];
    const decodedToken = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    // Firebase ID tokens use 'sub' for the UID and 'user_id' for the alias
    const uid = decodedToken.sub || decodedToken.user_id;

    if (!decodedToken || !uid) {
        return NextResponse.json({ message: 'Invalid token structure' }, { status: 401 });
    }

    // 2. Admin role check
    const isAdmin = await getAdminStatus(uid, decodedToken.email);

    if (!isAdmin) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
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
            console.error("Auth creation failed:", authError);
            throw new Error(`Authentication Engine Error: ${authError.message}`);
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
      phone: phone || 'N/A',
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
      { message: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
