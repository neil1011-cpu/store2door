import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Resilient Account Creation API.
 * Uses the REST Identity Platform API to avoid server-side OAuth2 token refresh failures
 * in restrictive development environments.
 */

const FIREBASE_API_KEY = "AIzaSyCxZ7fHM0GTfBtkyxaAhotzDw5udr7lFvQ";

export async function POST(request: Request) {
  try {
    const {
      firstName,
      lastName,
      email,
      defaultPassword,
      skipFirestore = false
    } = await request.json();

    // 1. Authorization: Manual JWT Decode
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    const tokenParts = idToken.split('.');
    if (tokenParts.length < 2) {
        return NextResponse.json({ message: 'Unauthorized: Malformed token' }, { status: 401 });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const adminEmail = payload.email;

    // Hardcoded bypass for the primary administrator to prevent lockout
    if (adminEmail !== 'admin@neilussolutions.com') {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Create Auth user via REST API 
    // (Bypasses Admin SDK Token Refresh issues entirely)
    const authPayload = {
      email: email?.trim().toLowerCase(),
      password: defaultPassword || 'User@1234',
      displayName: `${firstName} ${lastName}`,
      returnSecureToken: false
    };

    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });

    const authData = await authRes.json();

    if (authRes.ok) {
        return NextResponse.json({
            message: 'Auth account created',
            uid: authData.localId,
        });
    } else {
        // Handle "Email Exists" gracefully for migrations
        if (authData.error?.message === 'EMAIL_EXISTS') {
            // In a real REST API we can't fetch the UID easily without service account credentials,
            // so we return a specific error that the client tool can handle.
            return NextResponse.json({ 
                message: 'User identity already exists in system.', 
                existingUid: 'ALREADY_EXISTS_REDIRECTING_TO_SYNC' 
            }, { status: 409 });
        }
        throw new Error(`Auth System Error: ${authData.error?.message || 'Unknown'}`);
    }

  } catch (error: any) {
    console.error('Migration API Error:', error);
    return NextResponse.json(
      { message: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
