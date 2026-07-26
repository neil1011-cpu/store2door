import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField, cleanPayload } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Creation API.
 * Features: Secure auth-first creation, atomic mailbox assignment, and cleaned payload assurance.
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

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
    }
    
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
        return NextResponse.json({ 
            success: false, 
            message: 'Email and full name are required.' 
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
            email: email.trim().toLowerCase(),
            password: defaultPassword || 'User@1234',
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[API AUTH ERROR]:', authError.code);
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ 
                 success: false,
                 message: 'This email is already registered.', 
             }, { status: 409 });
        }
        throw authError;
    }

    // 3. Create Database Profile with Cleaned Payload
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
            });

            transaction.set(userProfileRef, profileData, { merge: true });

            return mailboxId;
        });

        console.log(`[API SUCCESS] Created user ${email} with mailbox ${finalMailbox}`);
        return NextResponse.json({
            success: true,
            message: 'User profile created.',
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[API DB ERROR]:', dbError.message);
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: dbError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API CRITICAL ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error occurred.' },
      { status: 500 }
    );
  }
}
