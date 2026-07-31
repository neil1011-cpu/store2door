
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Universal Registry Purge Protocol.
 * Aggressively removes all non-admin users and resets mailbox numbering.
 * Hardened with recursive subcollection deletion and deep logging.
 * PROTECTS: Any account in admin_roles and admin@neilussolutions.com.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Authorization required.' }, { status: 401 });
        }

        const idToken = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const SUPER_ADMIN = 'admin@neilussolutions.com';

        // Verify Admin Access
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
        const isSuperAdmin = decodedToken.email === SUPER_ADMIN;

        if (!adminRoleSnap.exists && !isSuperAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
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

            // Skip if admin role exists, if it's the super admin email, OR if it's the current session user
            if (protectedUids.has(uid) || userData.email === SUPER_ADMIN) {
                console.log(`[PURGE] Protecting account: ${userData.email || uid}`);
                continue;
            }

            console.log(`[PURGE] Wiping data for user: ${userData.email || 'N/A'} (${uid})`);

            try {
                // 1. Wipe Specific Known Subcollections to prevent timeouts
                const subcollections = ['pre_alerts', 'shipments'];
                for (const collName of subcollections) {
                    const collRef = userDoc.ref.collection(collName);
                    const subDocs = await collRef.get();
                    if (!subDocs.empty) {
                        const batch = adminDb.batch();
                        subDocs.forEach(sd => batch.delete(sd.ref));
                        await batch.commit();
                        console.log(`[PURGE] Deleted subcollection: ${collName} for ${uid}`);
                    }
                }

                // 2. Discover and purge any other subcollections
                try {
                    const collections = await userDoc.ref.listCollections();
                    for (const coll of collections) {
                        if (subcollections.includes(coll.id)) continue;
                        const docs = await coll.get();
                        const batch = adminDb.batch();
                        docs.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                } catch (e) {
                    console.warn(`[PURGE] listCollections failed for ${uid}, continuing...`);
                }

                // 3. Delete from Firebase Authentication
                await adminAuth.deleteUser(uid).catch((authErr: any) => {
                    if (authErr.code !== 'auth/user-not-found') {
                        console.error(`[PURGE] Auth deletion failed for ${uid}:`, authErr);
                    }
                });

                // 4. Delete the primary profile document
                await userDoc.ref.delete();
                deletedCount++;
                
            } catch (err) {
                console.error(`[PURGE] Failed to fully remove user ${uid}:`, err);
            }
        }

        // 5. Reset Mailbox Counter to 101
        await adminDb.collection('metadata').doc('mailboxCounter').set({ next: 101 }, { merge: true });

        console.log(`[PURGE] Reset protocol complete. Total clients removed: ${deletedCount}`);

        return NextResponse.json({ 
            success: true, 
            message: `Wipe complete. Removed ${deletedCount} users.`,
            deletedCount 
        });

    } catch (criticalError: any) {
        console.error('[PURGE API] Fatal internal failure:', criticalError);
        console.error(criticalError.stack);
        return NextResponse.json({ 
            success: false, 
            message: 'System reset aborted due to server error. Check logs.' 
        }, { status: 500 });
    }
}
