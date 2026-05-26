
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Uses the centralized admin SDK instance to ensure project ID consistency.
 */

export async function POST(request: Request) {
    try {
        const { userId, newPassword } = await request.json();

        // 1. Verify Authorization
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];

        // 2. Verify the Admin Session
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // 3. Authority Check
        const isAdminEmail = decodedToken.email === 'info@fromstore2door.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isAdminEmail) {
            return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
        }
        
        // 4. Validation
        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid payload: user identity and a valid password (min 6 chars) required.' }, { status: 400 });
        }

        // 5. Execute Update
        await adminAuth.updateUser(userId, {
            password: newPassword,
        });

        return NextResponse.json({ message: 'Password has been updated successfully.' });

    } catch (error: any) {
        console.error('Reset Password API Error:', error);
        return NextResponse.json({ message: error.message || 'An internal error occurred.' }, { status: 500 });
    }
}
