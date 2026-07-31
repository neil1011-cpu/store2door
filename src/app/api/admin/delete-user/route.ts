
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Hardened User Deletion API.
 * Permanently removes a user from both Authentication and the Primary Registry, including all subcollections.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();

        if (!adminRoleSnap.exists && !isAdminEmail) {
            return NextResponse.json({ success: false, message: 'Access Denied.' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { userId } = body;
        
        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
        }

        console.log(`[DELETE API] Initiating deep purge for: ${userId}`);

        // 1. Recursive Subcollection Purge
        const userRef = adminDb.collection('users').doc(userId);
        const collections = await userRef.listCollections();
        
        for (const coll of collections) {
            const docs = await coll.get();
            const batch = adminDb.batch();
            docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log(`[DELETE API] Purged collection: ${coll.id}`);
        }

        // 2. Remove Profile from Firestore
        await userRef.delete();

        // 3. Remove from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
        } catch (authErr: any) {
            if (authErr.code !== 'auth/user-not-found') {
                console.error('[DELETE API] Auth error:', authErr);
            }
        }

        // 4. Cleanup Admin Role if exists
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
