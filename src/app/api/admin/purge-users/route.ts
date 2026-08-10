import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Universal Registry Purge Protocol.
 * Aggressively removes all non-admin users and protects Master Admin @neilussolutions.com.
 */

export async function POST(request: Request) {
    console.log('[API: SYSTEM-PURGE] Request initiated.');
    
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Authorization required.' }, { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const MASTER_ADMIN = 'admin@neilussolutions.com';

        // Verify Admin Access
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        const isMaster = decodedToken.email === MASTER_ADMIN;

        if (!adminRoleSnap.exists && !isMaster) {
            return NextResponse.json({ success: false, message: 'Unauthorized: Administrative privileges required.' }, { status: 403 });
        }

        console.log(`[PURGE] Starting global sweep initiated by ${decodedToken.email}`);

        // Identify Protected UIDs from admin_roles
        const adminRolesSnapshot = await adminDb.collection('admin_roles').get();
        const protectedUids = new Set(adminRolesSnapshot.docs.map(doc => doc.id));
        protectedUids.add(decodedToken.uid); // Protect the current session user

        const usersSnapshot = await adminDb.collection('users').get();
        let deletedCount = 0;

        console.log(`[PURGE] Scanning ${usersSnapshot.size} records for deletion.`);

        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            const userData = userDoc.data();

            // Skip if admin role exists, if it's the master admin email, OR if it's the current session user
            if (protectedUids.has(uid) || userData.email === MASTER_ADMIN) {
                console.log(`[PURGE] Protecting account: ${userData.email || uid}`);
                continue;
            }

            try {
                // 1. Wipe Specific Known Subcollections
                const subcollections = ['pre_alerts', 'shipments'];
                for (const collName of subcollections) {
                    const collRef = userDoc.ref.collection(collName);
                    const subDocs = await collRef.get();
                    if (!subDocs.empty) {
                        const batch = adminDb.batch();
                        subDocs.forEach(sd => batch.delete(sd.ref));
                        await batch.commit();
                    }
                }

                // 2. Delete from Firebase Authentication
                await adminAuth.deleteUser(uid).catch((authErr: any) => {
                    if (authErr.code !== 'auth/user-not-found') {
                        console.error(`[PURGE] Auth deletion failed for ${uid}:`, authErr.message);
                    }
                });

                // 3. Delete the primary profile document
                await userDoc.ref.delete();
                deletedCount++;
                
            } catch (err: any) {
                console.error(`[PURGE] Failed to fully remove user ${uid}:`, err.message);
            }
        }

        // 4. Reset Mailbox Counter to 101
        await adminDb.collection('metadata').doc('mailboxCounter').set({ next: 101 }, { merge: true });

        console.log(`[PURGE] Reset protocol complete. Total clients removed: ${deletedCount}`);

        return NextResponse.json({ 
            success: true, 
            message: `Wipe complete. Removed ${deletedCount} users.`,
            deletedCount 
        });

    } catch (criticalError: any) {
        console.error('[PURGE API FATAL EXCEPTION]:', criticalError.message, criticalError.stack);
        return NextResponse.json({ 
            success: false, 
            message: 'System reset aborted due to server exception: ' + criticalError.message 
        }, { status: 500 });
    }
}
