
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Internal API for recording audit logs and system activity.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, description, metadata, userId, userName } = body;

        if (!type || !description) {
            return NextResponse.json({ message: 'Log type and description required' }, { status: 400 });
        }

        await adminDb.collection('system_logs').add({
            type,
            description,
            metadata: metadata || {},
            userId: userId || 'system',
            userName: userName || 'System',
            timestamp: serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[ACTIVITY LOG ERROR]:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to record activity log' },
            { status: 500 }
        );
    }
}
