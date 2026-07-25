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

    let decodedToken;
    try {
      const idToken = authHeader.substring(7);
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      return NextResponse.json({ message: 'Invalid or expired session token.' }, { status: 401 });
    }
    
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

    if (!isHardcodedAdmin && !adminRoleSnap.exists) {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Create Auth User (Outside transaction to avoid service lock)
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
             const existing = await adminAuth.getUserByEmail(email.trim().toLowerCase());
             return NextResponse.json({ 
                 message: 'This email is already registered in the system.', 
                 existingUid: existing.uid,
                 code: authError.code 
             }, { status: 409 });
        }
        return NextResponse.json({ message: `Auth Service Error: ${authError.message}` }, { status: 500 });
    }

    // 3. Atomic Mailbox Generation & Profile Creation
    try {
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
    } catch (dbError: any) {
        // Cleanup Auth if DB failed (optional but recommended)
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ message: `Database Transaction Failed: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('CRITICAL ERROR in create-user route:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
