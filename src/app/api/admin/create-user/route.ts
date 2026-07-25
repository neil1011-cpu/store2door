import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Creation API.
 * Features: Secure auth-first creation, atomic mailbox assignment, and detailed error logging.
 */

export async function POST(request: Request) {
  console.log('[API] Initializing user creation pipeline...');
  
  try {
    // 1. Safe Body Extraction
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.warn('[API] Empty or invalid JSON body received.');
      return NextResponse.json({ success: false, message: 'Request body must be valid JSON.' }, { status: 400 });
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

    // 2. Data Validation
    if (!email || !firstName || !lastName) {
        return NextResponse.json({ 
            success: false, 
            message: 'Required fields missing: Email and Full Name are mandatory.' 
        }, { status: 400 });
    }

    // 3. Admin Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Administrative authorization token missing.' }, { status: 401 });
    }

    let decodedToken;
    try {
      const idToken = authHeader.substring(7);
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[API] Admin token verification failed:', tokenErr.message);
      return NextResponse.json({ success: false, message: 'Invalid administrative session.' }, { status: 401 });
    }
    
    // Authorization Check: Verify admin_roles entry or specific hardcoded admin
    const adminEmail = decodedToken.email;
    const isHardcodedAdmin = adminEmail === 'admin@neilussolutions.com';
    let hasAdminRole = false;
    
    try {
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        hasAdminRole = adminRoleSnap.exists;
    } catch (dbErr) {
        console.error('[API] Error checking admin_roles collection:', dbErr);
    }

    if (!isHardcodedAdmin && !hasAdminRole) {
        return NextResponse.json({ success: false, message: 'Insufficient privileges. Admin access required.' }, { status: 403 });
    }

    // 4. Create Authentication Account
    console.log(`[API] Authorizing account for: ${email}`);
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
                 message: 'This email is already registered in the worldwide system.', 
             }, { status: 409 });
        }
        throw authError; // Pass to main catch for 500
    }

    // 5. Database Transaction for Atomic Profile Creation
    try {
        const finalMailbox = await adminDb.runTransaction(async (transaction) => {
            let mailboxId = requestedMailbox;

            // Generate FSTD number if not provided by migration
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

        console.log(`[API SUCCESS] Created user ${email} with mailbox ${finalMailbox}`);
        return NextResponse.json({
            success: true,
            message: 'Global logistics profile created.',
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[API DB ERROR]:', dbError.message);
        // Rollback Auth if DB profile creation fails to maintain consistency
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database Failure: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API CRITICAL EXCEPTION]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error interrupted user creation.' },
      { status: 500 }
    );
  }
}
