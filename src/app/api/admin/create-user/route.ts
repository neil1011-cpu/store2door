import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure Administrative Account Creation API.
 * Handles Auth user creation, Mailbox Number generation, and Firestore Profile establishment.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await getSafeBody(request);
    
    const {
      firstName,
      lastName,
      email,
      phone,
      trn,
      defaultPassword,
      mailboxNumber: requestedMailbox
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
    
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

    if (!isHardcodedAdmin && !adminRoleSnap.exists) {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Create Auth User (Outside transaction)
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
             // Return existing user if applicable or appropriate status
             const existing = await adminAuth.getUserByEmail(email.trim().toLowerCase());
             return NextResponse.json({ 
                 message: 'Identity already exists.', 
                 existingUid: existing.uid,
                 code: authError.code 
             }, { status: 409 });
        }
        throw authError;
    }

    // 3. Atomic Mailbox Generation & Profile Creation
    const mailboxResult = await adminDb.runTransaction(async (transaction) => {
        let finalMailbox = requestedMailbox;

        if (!finalMailbox) {
            const counterRef = adminDb.collection('metadata').doc('mailboxCounter');
            const counterSnap = await transaction.get(counterRef);
            let nextNum = 101;
            if (counterSnap.exists) {
                nextNum = counterSnap.data()?.next || 101;
            }
            finalMailbox = `FSTD${nextNum}`;
            transaction.set(counterRef, { next: nextNum + 1 }, { merge: true });
        }

        const userProfileRef = adminDb.collection('users').doc(userRecord.uid);
        const userAddress = {
            address1: '3507 NW 19th ST',
            address2: `${finalMailbox}-FSTD`,
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
            mailboxNumber: finalMailbox,
            address: userAddress,
            walletBalance: 0,
            createdAt: new Date(),
            needsPasswordReset: true,
            pickupPersonnel: [],
            dropoffAddresses: [],
        }, { merge: true });

        return finalMailbox;
    });

    return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        uid: userRecord.uid,
        mailbox: mailboxResult
    });

  } catch (error: any) {
    console.error('Admin User Creation Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}