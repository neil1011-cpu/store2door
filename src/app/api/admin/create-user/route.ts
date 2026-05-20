import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Resilient Account Creation API.
 * Hardened to prevent "payload must be object" errors.
 */

const FIREBASE_API_KEY = "AIzaSyCxZ7fHM0GTfBtkyxaAhotzDw5udr7lFvQ";

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await getSafeBody(request);
    
    const {
      firstName,
      lastName,
      email,
      defaultPassword,
    } = body;

    if (!email) {
        return NextResponse.json({ message: 'Missing email address' }, { status: 400 });
    }

    // 1. Authorization: Manual JWT Decode with strict object checks
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    if (!idToken || idToken === 'null' || idToken === 'undefined') {
        return NextResponse.json({ message: 'Unauthorized: Invalid token value' }, { status: 401 });
    }

    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
        return NextResponse.json({ message: 'Unauthorized: Malformed token structure' }, { status: 401 });
    }

    let tokenClaims;
    try {
        const decoded = Buffer.from(tokenParts[1], 'base64').toString();
        tokenClaims = decoded ? JSON.parse(decoded) : null;
    } catch (e) {
        return NextResponse.json({ message: 'Unauthorized: Invalid token encoding' }, { status: 401 });
    }

    if (!tokenClaims || typeof tokenClaims !== 'object') {
        return NextResponse.json({ message: 'Unauthorized: Payload is not an object' }, { status: 401 });
    }

    const adminEmail = tokenClaims.email;

    // Hardcoded bypass for the primary administrator to prevent lockout
    if (adminEmail !== 'admin@neilussolutions.com') {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Create Auth user via REST API 
    const authPayload = {
      email: email.trim().toLowerCase(),
      password: defaultPassword || 'User@1234',
      displayName: `${firstName || ''} ${lastName || ''}`.trim(),
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
        // Handle "Email Exists" gracefully
        if (authData.error?.message === 'EMAIL_EXISTS') {
            try {
                const user = await adminAuth.getUserByEmail(email.trim().toLowerCase());
                return NextResponse.json({ 
                    message: 'User identity synchronized.', 
                    existingUid: user.uid 
                }, { status: 200 });
            } catch (adminError) {
                return NextResponse.json({ 
                    message: 'User exists but identity check failed.', 
                    existingUid: null 
                }, { status: 409 });
            }
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
