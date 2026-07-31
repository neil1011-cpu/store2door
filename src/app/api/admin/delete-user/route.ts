
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Hardened User Deletion API.
 * Permanently removes a user from Registry, protecting Master Admin identities.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const MASTER_ADMIN = 'admin@neilussolutions.com';
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

        if (!adminRoleSnap.exists && decodedToken.email !== MASTER_ADMIN) {
            return NextResponse.json({ success: false, message: 'Access Denied.' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { userId } = body;
        
        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
        }

        // 1. Identity Protection double-check
        const targetUser = await adminAuth.getUser(userId).catch(() => null);
        if (targetUser?.email === MASTER_ADMIN) {
             return NextResponse.json({ success: false, message: 'Master Admin account is immutable.' }, { status: 403 });
        }

        console.log(`[DELETE API] Initiating deep purge for UID: ${userId}`);

        const userRef = adminDb.collection('users').doc(userId);
        
        // 2. Targeted Subcollection Purge
        const subcollections = ['shipments', 'pre_alerts'];
        for (const collName of subcollections) {
            const collRef = userRef.collection(collName);
            const docs = await collRef.get();
            if (!docs.empty) {
                const batch = adminDb.batch();
                docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                console.log(`[DELETE API] Purged collection: ${collName}`);
            }
        }

        // 3. Discover and purge any other subcollections
        try {
            const collections = await userRef.listCollections();
            for (const coll of collections) {
                if (subcollections.includes(coll.id)) continue;
                const docs = await coll.get();
                const batch = adminDb.batch();
                docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        } catch (e) {
            console.warn('[DELETE API] listCollections failed, continuing...');
        }

        // 4. Remove Profile from Firestore
        await userRef.delete();

        // 5. Remove from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
        } catch (authErr: any) {
            if (authErr.code !== 'auth/user-not-found') {
                console.error('[DELETE API] Auth error:', authErr);
            }
        }

        // 6. Cleanup Admin Role if exists (Protect Master Admin check above already ensures this isn't the master)
        await adminDb.collection('admin_roles').doc(userId).delete();

        console.log(`[DELETE API] Successfully purged user: ${userId}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Account permanently removed from registry.' 
        });

    } catch (error: any) {
        console.error('[DELETE API] Fatal failure:', error);
        console.error(error.stack);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Deletion failed.' 
        }, { status: 500 });
    }
}
