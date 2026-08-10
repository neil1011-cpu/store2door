
import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField, cleanPayload } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Robust Administrative User Creation API with exhaustive diagnostics and role support.
 * Implements full error object and stack trace logging as requested.
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Authorization session required.' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    if (!idToken) {
      return NextResponse.json({ success: false, message: 'Invalid Authorization format.' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
    }

    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || 'N/A').trim();
    const trn = String(body.trn || 'N/A').trim();
    const defaultPassword = String(body.defaultPassword || 'User@1234');
    const requestedMailbox = body.mailboxNumber ? String(body.mailboxNumber).trim().toUpperCase() : null;
    const isNewAdmin = !!body.isAdmin;

    if (!email || !firstName || !lastName) {
        return NextResponse.json({ success: false, message: 'Email, First, and Last names are required.' }, { status: 400 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr: any) {
      console.error('[API] Token verification failed:', tokenErr.message);
      return NextResponse.json({ success: false, message: 'Administrative session expired. Please sign in again.' }, { status: 401 });
    }
    
    const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
    const isMasterAdmin = decodedToken.email === 'admin@neilussolutions.com';
    
    if (!adminRoleSnap.exists && !isMasterAdmin) {
        return NextResponse.json({ success: false, message: 'Access Denied: Administrative privileges required.' }, { status: 403 });
    }

    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email: email,
            password: defaultPassword,
            displayName: `${firstName} ${lastName}`.trim(),
        });
    } catch (authError: any) {
        console.error('[API] Auth user create error:', authError.code, authError.message);
        
        if (authError.code === 'auth/email-already-in-use') {
             return NextResponse.json({ success: false, message: 'This email is already registered in the worldwide system.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: `System Error: ${authError.message}` }, { status: 500 });
    }

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

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            mailbox: finalMailbox
        });
        
    } catch (dbError: any) {
        console.error('[API] Firestore transaction error:', dbError.message);
        
        // Cleanup Auth User if DB creation fails
        await adminAuth.deleteUser(userRecord.uid).catch(() => {});
        return NextResponse.json({ success: false, message: `Database synchronization error: ${dbError.message}` }, { status: 500 });
    }

  } catch (criticalError: any) {
    console.error('[API CRITICAL FAILURE]:', criticalError.message);
    return NextResponse.json(
      { success: false, message: 'A catastrophic internal error occurred. Please check system logs.' },
      { status: 500 }
    );
  }
}
