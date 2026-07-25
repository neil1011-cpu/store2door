import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure Administrative User Creation API.
 * High-resilience implementation with unified logging and descriptive error paths.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    console.error('[API] Body Parse Failure:', e);
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

    // 1. Structural Validation
    if (!email || !firstName || !lastName) {
        return NextResponse.json({ 
            success: false, 
            message: `Required fields missing: ${!email ? 'Email' : ''} ${!firstName ? 'First Name' : ''} ${!lastName ? 'Last Name' : ''}`.trim() 
        }, { status: 400 });
    }

    // 2. Security Check: Authenticate the requesting Admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Authorization missing.' }, { status: 401 });
    }

    let decodedToken;
    try {
      const idToken = authHeader.substring(7);
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      return NextResponse.json({ success: false, message: `Session expired or invalid: ${tokenErr.message}` }, { status: 401 });
    }
    
    // Authorization Check: Verify admin_roles entry or hardcoded domain fallback
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

    if (!isHardcodedAdmin && !adminRoleSnap.exists) {
        return NextResponse.json({ success: false, message: 'Insufficient Privileges: Administrator access required.' }, { status: 403 });
    }

    // 3. Auth Service Operation: Create the secure account
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[API AUTH ERROR]:', authError.code, authError.message);
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ 
                 success: false,
                 message: 'This email is already registered in the worldwide system.', 
                 code: authError.code 
             }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: `Authentication Service Error: ${authError.message}` }, { status: 500 });
    }

    // 4. Database Transaction: Atomic Mailbox Assignment & Profile Creation
    try {
        const finalMailbox = await adminDb.runTransaction(async (transaction) => {
            let mailboxId = requestedMailbox;

            // Generate FSTD number if not provided
            if (!mailboxId) {
                const counterRef = adminDb.collection('metadata').doc('mailboxCounter');
                const counterSnap = await transaction.get(counterRef);
                let nextNum = 101;
                
                if (counterSnap.exists) {
                    nextNum = counterSnap.data()?.next || 101;
                }
                
                mailboxId = `FSTD${nextNum}`;
                transaction.set(counterRef, { next: nextNum + 1 }, { merge: true });
            }

            const userProfileRef = adminDb.collection('users').doc(userRecord.uid);
            const userAddress = {
                address1: '3507 NW 19th ST',
                address2: `${mailboxId}-FSTD`,
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
                mailboxNumber: mailboxId,
                address: userAddress,
                walletBalance: 0,
                createdAt: adminField.serverTimestamp(),
                needsPasswordReset: true,
                pickupPersonnel: [],
                dropoffAddresses: [],
            }, { merge: true });

            return mailboxId;
        });

        return NextResponse.json({
            success: true,
            message: 'Global logistics profile created.',
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[API DB ERROR]:', dbError.message);
        // Rollback Auth if DB creation fails
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database Consistency Failure: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API CRITICAL EXCEPTION]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'A critical server exception interrupted user creation.' },
      { status: 500 }
    );
  }
}
