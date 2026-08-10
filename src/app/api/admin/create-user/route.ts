import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField, cleanPayload } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Creation API.
 * Provides exhaustive diagnostics and descriptive error messages for absolute transparency.
 */

export async function POST(request: Request) {
  console.log('[API: CREATE-USER] New request received.');
  
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[CREATE USER] Missing or malformed Authorization header.');
      return NextResponse.json({ success: false, message: 'Administrative authorization session required.' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    if (!idToken) {
      return NextResponse.json({ success: false, message: 'Invalid token format detected.' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        console.error('[CREATE USER] Failed to parse JSON body.');
        return NextResponse.json({ success: false, message: 'Malformed JSON payload.' }, { status: 400 });
    }

    const { firstName, lastName, email, phone, trn, isAdmin } = body;
    const defaultPassword = body.defaultPassword || 'User@1234';
    const requestedMailbox = body.mailboxNumber ? String(body.mailboxNumber).trim().toUpperCase() : null;

    if (!email || !firstName || !lastName) {
        return NextResponse.json({ success: false, message: 'Required fields: Email, First Name, Last Name.' }, { status: 400 });
    }

    // 1. Verify Administrative Authority
    console.log('[CREATE USER] Verifying identity token...');
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[CREATE USER] Token verification failed:', tokenErr.message);
      return NextResponse.json({ success: false, message: 'Session validation failed: ' + tokenErr.message }, { status: 401 });
    }
    
    console.log('[CREATE USER] Checking administrative role for:', decodedToken.email);
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
    const isMasterAdmin = decodedToken.email === 'admin@neilussolutions.com';
    
    if (!adminRoleSnap.exists && !isMasterAdmin) {
        console.warn('[CREATE USER] Access Denied for UID:', decodedToken.uid);
        return NextResponse.json({ success: false, message: 'Access Denied: You do not have permission to create users.' }, { status: 403 });
    }

    // 2. Create Authentication Identity
    console.log('[CREATE USER] Creating Firebase Auth user:', email);
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: defaultPassword,
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[CREATE USER] Auth creation error:', authError.code, authError.message);
        
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ success: false, message: 'This email is already associated with an account.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: `Identity System Error: ${authError.message}` }, { status: 500 });
    }

    // 3. Establish Registry Record and Mailbox via Transaction
    console.log('[CREATE USER] Initiating database registry transaction...');
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
            
            const profileData = cleanPayload({
                id: userRecord.uid,
                fullName: `${firstName} ${lastName}`.trim(),
                firstName: firstName,
                lastName: lastName,
                email: email.trim().toLowerCase(),
                phone: phone || 'N/A',
                trn: trn || 'N/A',
                mailboxNumber: mailboxId,
                address: {
                    address1: '3507 NW 19th ST',
                    address2: `${mailboxId}-FSTD`,
                    city: 'Lauderdale Lake',
                    state: 'FL',
                    zip: '33311-4224',
                },
                walletBalance: 0,
                createdAt: adminField.serverTimestamp(),
                needsPasswordReset: true,
                pickupPersonnel: [],
                dropoffAddresses: [],
            });

            transaction.set(userProfileRef, profileData, { merge: true });

            if (isAdmin) {
                const adminRoleRef = adminDb.collection('admin_roles').doc(userRecord.uid);
                transaction.set(adminRoleRef, {
                    isAdmin: true,
                    email: email.trim().toLowerCase(),
                    uid: userRecord.uid,
                    createdAt: adminField.serverTimestamp()
                });
            }

            return mailboxId;
        });

        // 4. Record Administrative Action in Logs
        console.log('[CREATE USER] Success! Logging action.');
        await adminDb.collection('system_logs').add({
            type: 'user_creation',
            description: `Admin created user ${email} (${finalMailbox}).`,
            userId: decodedToken.uid,
            userName: decodedToken.name || decodedToken.email,
            timestamp: adminField.serverTimestamp(),
            metadata: { mailbox: finalMailbox, isNewAdmin: !!isAdmin }
        }).catch(e => console.warn('[LOGS] Failed to record user creation:', e.message));

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[CREATE USER] Firestore transaction error:', dbError.message);
        
        // Cleanup Auth User if DB creation fails to prevent orphaned auth accounts
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database Registry Error: ${dbError.message}` }, { status: 500 });
    }

  } catch (criticalError: any) {
    console.error('[CREATE USER FATAL EXCEPTION]:', criticalError.message, criticalError.stack);
    return NextResponse.json(
      { success: false, message: 'System Exception: ' + criticalError.message },
      { status: 500 }
    );
  }
}
