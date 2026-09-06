
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { runDataMigration } from '@/lib/migration-service';

/**
 * @fileOverview Secure trigger for Phase 3C Data Migration.
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Admin check
    const adminSnap = await adminDb.collection('admin_roles').doc(decodedToken.uid).get();
    if (!adminSnap.exists && decodedToken.email !== 'admin@neilussolutions.com') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const isDryRun = body.isDryRun !== false;

    const report = await runDataMigration(isDryRun);

    return NextResponse.json({
      success: true,
      isDryRun,
      report
    });

  } catch (error: any) {
    console.error('[MIGRATION API ERROR]', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
