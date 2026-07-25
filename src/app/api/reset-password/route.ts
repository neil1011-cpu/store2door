import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Secure administrative password reset endpoint.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
    try {
        const body = await getSafeBody(request);
        const { userId, newPassword } = body;

        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

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

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
    }
}