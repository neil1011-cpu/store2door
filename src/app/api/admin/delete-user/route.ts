
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure User Deletion API.
 * Permanently removes a user from both Authentication and the Primary Registry.
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
            return NextResponse.json({ success: false, message: 'Access Denied: Administrator privileges required.' }, { status: 403 });
        }

        const { userId } = await request.json().catch(() => ({}));
        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required for deletion.' }, { status: 400 });
        }

        // 1. Remove from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
        } catch (authErr: any) {
            // If user doesn't exist in Auth anymore, we continue to cleanup Firestore
            if (authErr.code !== 'auth/user-not-found') {
                console.error('[API] Delete Auth Error:', authErr);
                throw authErr;
            }
        }

        // 2. Remove Profile from Firestore
        await adminDb.collection('users').doc(userId).delete();

        // 3. Optional: Remove Admin Role if exists
        await adminDb.collection('admin_roles').doc(userId).delete();

        return NextResponse.json({ 
            success: true, 
            message: 'User identity and registry profile permanently removed.' 
        });

    } catch (error: any) {
        console.error('[API] Global Delete Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Deletion protocol failed.' 
        }, { status: 500 });
    }
}
