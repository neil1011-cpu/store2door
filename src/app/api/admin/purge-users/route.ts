
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Administrative System Reset API.
 * Permanently purges all non-admin users and resets the mailbox sequence to a starting point.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Authorization required.' }, { status: 401 });
        }

        const idToken = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 1. Authorization Check (Must be a registered admin)
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        const isHardcodedAdmin = decodedToken.email === 'admin@neilussolutions.com';

        if (!adminRoleSnap.exists && !isHardcodedAdmin) {
            return NextResponse.json({ success: false, message: 'Access Denied: Administrator level required.' }, { status: 403 });
        }

        // 2. Identify Protected UIDs (Current administrators who must NOT be deleted)
        const adminRolesSnapshot = await adminDb.collection('admin_roles').get();
        const protectedUids = new Set(adminRolesSnapshot.docs.map(doc => doc.id));
        protectedUids.add(decodedToken.uid);

        // 3. Fetch all user profiles for purging
        const usersSnapshot = await adminDb.collection('users').get();
        let deletedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            const userData = userDoc.data();

            // Skip administrators and high-level protection accounts
            if (protectedUids.has(uid) || userData.email === 'admin@neilussolutions.com') {
                console.log(`[PURGE] Skipping protected admin account: ${userData.email}`);
                continue;
            }

            try {
                // Remove from Firebase Authentication
                await adminAuth.deleteUser(uid).catch((e) => {
                    if (e.code !== 'auth/user-not-found') throw e;
                });

                // Deep Purge subcollections (pre-alerts, shipments, etc.)
                const subCollections = await userDoc.ref.listCollections();
                for (const coll of subCollections) {
                    const subDocs = await coll.get();
                    for (const subDoc of subDocs.docs) {
                        await subDoc.ref.delete();
                    }
                }

                // Delete the primary profile document
                await userDoc.ref.delete();
                deletedCount++;
            } catch (delErr: any) {
                console.error(`[PURGE] Failed to remove user ${uid}:`, delErr);
            }
        }

        // 4. Reset mailbox counter to starting sequence (101)
        await adminDb.collection('metadata').doc('mailboxCounter').set({ next: 101 }, { merge: true });

        return NextResponse.json({ 
            success: true, 
            message: `System reset successful. Purged ${deletedCount} user identities.`,
            deletedCount 
        });

    } catch (criticalError: any) {
        console.error('[API] Purge Protocol Failure:', criticalError);
        console.error(criticalError.stack);
        return NextResponse.json({ 
            success: false, 
            message: criticalError.message || 'System reset aborted due to internal error.' 
        }, { status: 500 });
    }
}
