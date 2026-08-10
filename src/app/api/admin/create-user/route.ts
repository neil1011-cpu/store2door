import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField, cleanPayload } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Creation API with exhaustive diagnostics and role support.
 * Refined to provide descriptive error messages instead of generic 500 responses.
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
        return NextResponse.json({ success: false, message: 'Malformed JSON payload.' }, { status: 400 });
    }

    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const phone = String(body?.phone || 'N/A').trim();
    const trn = String(body?.trn || 'N/A').trim();
    const defaultPassword = String(body?.defaultPassword || 'User@1234');
    const requestedMailbox = body?.mailboxNumber ? String(body.mailboxNumber).trim().toUpperCase() : null;
    const isNewAdmin = !!(body?.isAdmin);

    if (!email || !firstName || !lastName) {
        return NextResponse.json({ success: false, message: 'Required fields: Email, First Name, Last Name.' }, { status: 400 });
    }

    // 1. Verify Administrative Authority
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[CREATE USER] Token verification failed:', tokenErr.message);
      return NextResponse.json({ success: false, message: 'Session validation failed: ' + tokenErr.message }, { status: 401 });
    }
    
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
    const isMasterAdmin = decodedToken.email === 'admin@neilussolutions.com';
    
    if (!adminRoleSnap.exists && !isMasterAdmin) {
        return NextResponse.json({ success: false, message: 'Access Denied: You do not have permission to create users.' }, { status: 403 });
    }

    // 2. Create Authentication Identity
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email,
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
                email: email,
                phone: phone,
                trn: trn,
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

            if (isNewAdmin) {
                const adminRoleRef = adminDb.collection('admin_roles').doc(userRecord.uid);
                transaction.set(adminRoleRef, {
                    isAdmin: true,
                    email: email,
                    uid: userRecord.uid,
                    createdAt: adminField.serverTimestamp()
                });
            }

            return mailboxId;
        });

        // 4. Record Administrative Action in Logs
        await adminDb.collection('system_logs').add({
            type: 'user_creation',
            description: `Admin created user ${email} (${finalMailbox}).`,
            userId: decodedToken.uid,
            userName: decodedToken.name || decodedToken.email,
            timestamp: adminField.serverTimestamp(),
            metadata: { mailbox: finalMailbox, isNewAdmin }
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
    console.error('[CREATE USER CRITICAL]:', criticalError.message, criticalError.stack);
    return NextResponse.json(
      { success: false, message: 'System Exception: ' + criticalError.message },
      { status: 500 }
    );
  }
}
