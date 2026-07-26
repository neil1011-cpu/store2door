import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField, cleanPayload } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Onboarding API.
 * Features: Secure auth-first creation, atomic mailbox assignment, and mandatory password reset flag.
 */

export async function POST(request: Request) {
  console.log('[API] User Creation: Initializing request...');
  
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Authorization required.' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    if (!idToken) {
        return NextResponse.json({ success: false, message: 'Invalid token format.' }, { status: 401 });
    }

    // Defensive body parsing
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
    }
    
    // Explicit casting to prevent 'undefined' values reaching Firestore
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || 'N/A').trim();
    const trn = String(body.trn || 'N/A').trim();
    const defaultPassword = String(body.defaultPassword || 'User@1234');
    const requestedMailbox = body.mailboxNumber ? String(body.mailboxNumber).trim() : null;

    if (!email || !firstName || !lastName) {
        return NextResponse.json({ 
            success: false, 
            message: 'Email, First Name, and Last Name are required.' 
        }, { status: 400 });
    }

    // 1. Verify Admin Session
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[API] Token verification failed:', tokenErr.message);
      return NextResponse.json({ success: false, message: 'Unauthorized session.' }, { status: 401 });
    }
    
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    let hasAdminRole = false;
    
    try {
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        hasAdminRole = adminRoleSnap.exists;
    } catch (dbErr) {}

    if (!isHardcodedAdmin && !hasAdminRole) {
        return NextResponse.json({ success: false, message: 'Admin privileges required.' }, { status: 403 });
    }

    // 2. Create Auth Account
    console.log(`[API] Creating auth account for: ${email}`);
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email,
            password: defaultPassword,
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[API AUTH ERROR]:', authError.code);
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ 
                 success: false,
                 message: 'This email is already registered in the system.', 
             }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: `Auth service error: ${authError.message}` }, { status: 500 });
    }

    // 3. Establish Database Profile within an Atomic Transaction
    try {
        const finalMailbox = await adminDb.runTransaction(async (transaction) => {
            let mailboxId = requestedMailbox;

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

            const profileData = cleanPayload({
                id: userRecord.uid,
                fullName: `${firstName} ${lastName}`.trim(),
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                trn: trn,
                mailboxNumber: mailboxId,
                address: userAddress,
                walletBalance: 0,
                createdAt: adminField.serverTimestamp(),
                needsPasswordReset: true,
                pickupPersonnel: [],
                dropoffAddresses: [],
            });

            transaction.set(userProfileRef, profileData, { merge: true });

            return mailboxId;
        });

        console.log(`[API SUCCESS] Created user ${email} with mailbox ${finalMailbox}`);
        return NextResponse.json({
            success: true,
            message: 'User profile established successfully.',
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[API DB ERROR]:', dbError.message);
        // Rollback: Attempt to cleanup the auth user if DB profile fails
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database transaction failure: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API CRITICAL ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'A catastrophic server error occurred.' },
      { status: 500 }
    );
  }
}
