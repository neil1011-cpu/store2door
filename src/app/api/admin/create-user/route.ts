import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure Administrative Account Creation API.
 * Handles Auth user creation, Mailbox Number generation, and Firestore Profile establishment.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      firstName,
      lastName,
      email,
      phone,
      trn,
      defaultPassword,
    } = body;

    if (!email || !firstName || !lastName) {
        return NextResponse.json({ message: 'Missing required fields (email, name)' }, { status: 400 });
    }

    // 1. Authorization Check (Admin only)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Verify admin privileges
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

    if (!isHardcodedAdmin && !adminRoleSnap.exists) {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Atomic Mailbox Generation & User Creation
    const result = await adminDb.runTransaction(async (transaction) => {
        // A. Generate Mailbox Number
        const counterRef = adminDb.collection('metadata').doc('mailboxCounter');
        const counterSnap = await transaction.get(counterRef);
        
        let nextNum = 101;
        if (counterSnap.exists) {
            nextNum = counterSnap.data()?.next || 101;
        }
        
        const mailboxNumber = `FSTD${nextNum}`;
        transaction.set(counterRef, { next: nextNum + 1 }, { merge: true });

        // B. Create Auth User
        const userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });

        // C. Create Firestore Profile
        const userProfileRef = adminDb.collection('users').doc(userRecord.uid);
        const userAddress = {
            address1: '3507 NW 19th ST',
            address2: `${mailboxNumber}-FSTD`,
            city: 'Lauderdale Lake',
            state: 'FL',
            zip: '33311-4224',
        };

        transaction.set(userProfileRef, {
            id: userRecord.uid,
            fullName: `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            email: email.trim().toLowerCase(),
            phone: phone || 'N/A',
            trn: trn || 'N/A',
            mailboxNumber,
            address: userAddress,
            walletBalance: 0,
            createdAt: new Date(),
            needsPasswordReset: true, // Mandatory reset on first login
            pickupPersonnel: [],
            dropoffAddresses: [],
        });

        return { uid: userRecord.uid, mailbox: mailboxNumber };
    });

    return NextResponse.json({
        message: 'Account created successfully',
        uid: result.uid,
        mailbox: result.mailbox
    });

  } catch (error: any) {
    console.error('Admin User Creation Error:', error);
    return NextResponse.json(
      { message: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
