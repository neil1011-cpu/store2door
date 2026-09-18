import { NextResponse } from 'next/server';

/**
 * @fileOverview This endpoint is neutralized in favor of /auth/callback.
 * Direct all PKCE authorization code exchanges to src/app/auth/callback/route.ts.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const origin = host ? `${protocol}://${host}` : requestUrl.origin;
    
    return NextResponse.redirect(`${origin}/auth/callback${requestUrl.search}`);
}
