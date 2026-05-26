
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Reverted admin email verification to admin@neilussolutions.com.
 */

export async function POST(request: Request) {
    try {
        const { userId, newPassword } = await request.json();

        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // Reverted email check
        const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isAdminEmail) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        
        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        await adminAuth.updateUser(userId, {
            password: newPassword,
        });

        return NextResponse.json({ message: 'Password updated' });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
