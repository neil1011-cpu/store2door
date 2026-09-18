import { NextResponse } from 'next/server';

/**
 * @fileOverview This endpoint is neutralized. 
 * The authoritative password reset flow now utilizes direct browser-side client initialization
 * in src/app/forgot-password/page.tsx to ensure reliable origin detection.
 */
export async function POST() {
    return NextResponse.json({ message: 'Authoritative flow has migrated to browser client.' }, { status: 410 });
}
