import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure Administrative Account Creation API.
 * Hardened with definitive return paths and robust error reporting to prevent 500 crashes.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    console.error('[API] Failed to parse request body as JSON:', e);
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

    // 1. Initial Validation
    if (!email || !firstName || !lastName) {
        return NextResponse.json({ 
            success: false, 
            message: `Missing required fields: ${!email ? 'email' : ''} ${!firstName ? 'firstName' : ''} ${!lastName ? 'lastName' : ''}`.trim() 
        }, { status: 400 });
    }

    // 2. Authorization Check (Admin only)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Missing or malformed token' }, { status: 401 });
    }

    let decodedToken;
    try {
      const idToken = authHeader.substring(7);
      if (!idToken) throw new Error('Empty token payload');
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[API AUTH ERROR]:', tokenErr.message);
      return NextResponse.json({ success: false, message: `Session invalid: ${tokenErr.message}` }, { status: 401 });
    }
    
    // Check for admin role in Firestore or hardcoded fallback
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

    if (!isHardcodedAdmin && !adminRoleSnap.exists) {
        return NextResponse.json({ success: false, message: 'Forbidden: Administrator privileges required' }, { status: 403 });
    }

    // 3. Create Auth User (Outside transaction to avoid service-lock)
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[API AUTH CREATE ERROR]:', authError);
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ 
                 success: false,
                 message: 'This email address is already registered in the system.', 
                 code: authError.code 
             }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: `Authentication Service Error: ${authError.message}` }, { status: 500 });
    }

    // 4. Atomic Mailbox Generation & Profile Creation
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
        console.error('[API DB ERROR]:', dbError);
        // Attempt to cleanup Auth if DB profile creation failed to allow retry
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database Profile Error: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API CRITICAL ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An unhandled server exception occurred.' },
      { status: 500 }
    );
  }
}
