
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Universal Registry Purge Protocol.
 * Aggressively removes all non-admin users and resets mailbox numbering.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Authorization required.' }, { status: 401 });
        }

        const idToken = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Verify Admin Access
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        const isHardcodedAdmin = decodedToken.email === 'admin@neilussolutions.com';

        if (!adminRoleSnap.exists && !isHardcodedAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
        }

        // Identify Protected UIDs
        const adminRolesSnapshot = await adminDb.collection('admin_roles').get();
        const protectedUids = new Set(adminRolesSnapshot.docs.map(doc => doc.id));
        protectedUids.add(decodedToken.uid);

        const usersSnapshot = await adminDb.collection('users').get();
        let deletedCount = 0;

        console.log(`[PURGE] Starting global sweep of ${usersSnapshot.size} records.`);

        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            const userData = userDoc.data();

            if (protectedUids.has(uid) || userData.email === 'admin@neilussolutions.com') {
                console.log(`[PURGE] Protecting admin account: ${userData.email}`);
                continue;
            }

            try {
                // Wipe Subcollections
                const subCollections = await userDoc.ref.listCollections();
                for (const coll of subCollections) {
                    const subDocs = await coll.get();
                    const batch = adminDb.batch();
                    subDocs.forEach(sd => batch.delete(sd.ref));
                    await batch.commit();
                }

                // Delete Auth
                await adminAuth.deleteUser(uid).catch(() => {});

                // Delete Profile
                await userDoc.ref.delete();
                deletedCount++;
            } catch (err) {
                console.error(`[PURGE] Error deleting ${uid}:`, err);
            }
        }

        // Reset Mailbox Counter
        await adminDb.collection('metadata').doc('mailboxCounter').set({ next: 101 }, { merge: true });

        console.log(`[PURGE] Finished. Deleted ${deletedCount} users.`);

        return NextResponse.json({ 
            success: true, 
            message: `Wipe complete. Removed ${deletedCount} users.`,
            deletedCount 
        });

    } catch (criticalError: any) {
        console.error('[PURGE API] Catastrophic failure:', criticalError);
        console.error(criticalError.stack);
        return NextResponse.json({ 
            success: false, 
            message: 'System reset aborted.' 
        }, { status: 500 });
    }
}
