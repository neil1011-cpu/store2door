import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Secure administrative password reset endpoint with Non-Blocking SMTP.
 * Prioritizes the security update and handles email dispatch as a non-fatal task.
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
    console.log('[API: RESET-PASSWORD] Request initiated.');
    try {
        const body = await getSafeBody(request);
        const { userId, newPassword } = body;

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Administrative authorization required.' }, { status: 401 });
        }
        const idToken = authHeader.substring(7);

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (tokenErr: any) {
            console.error('[RESET PASSWORD] Token verification failed:', tokenErr.message);
            return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
        }

        const adminUid = decodedToken.uid;
        const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isAdminEmail) {
            return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
        }
        
        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid payload. Password must be at least 6 characters.' }, { status: 400 });
        }

        let userRecord;
        try {
            userRecord = await adminAuth.getUser(userId);
        } catch (fetchErr: any) {
            return NextResponse.json({ message: 'Target user not found in identity registry.' }, { status: 404 });
        }

        const userProfileSnap = await adminDb.collection('users').doc(userId).get();
        const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;
        const recipientName = userProfile?.fullName || userRecord.displayName || 'Valued Customer';
        const recipientEmail = userRecord.email;

        if (!recipientEmail) {
             return NextResponse.json({ message: 'User email not found in authentication record.' }, { status: 404 });
        }

        // 1. PERFORM SECURITY UPDATE IMMEDIATELY
        console.log(`[RESET PASSWORD] Updating credentials in Auth: ${recipientEmail}`);
        await adminAuth.updateUser(userId, { password: newPassword });

        console.log(`[RESET PASSWORD] Flagging profile for reset in Firestore: ${userId}`);
        await adminDb.collection('users').doc(userId).update({
            needsPasswordReset: true,
            updatedAt: adminField.serverTimestamp()
        }).catch((e) => console.warn('[RESET PASSWORD] Profile flag update failed:', e.message));

        // 2. ATTEMPT EMAIL NOTIFICATION (Non-Fatal)
        let host = process.env.SMTP_HOST;
        let port = process.env.SMTP_PORT;
        let user = process.env.SMTP_USER;
        let pass = process.env.SMTP_PASS;

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            const configSnap = await adminDb.collection('metadata').doc('email_config').get();
            if (configSnap.exists) {
                const data = configSnap.data();
                host = data?.host || host;
                port = data?.port || port;
                user = data?.user || user;
                pass = data?.pass || pass;
            }
        }

        const subject = 'Your Secure Access Key Has Been Updated';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has updated your secure access key for the FromStore2Door platform.\n\nYour new credentials are:\nEmail: ${recipientEmail}\nNew Password: ${newPassword}\n\nPlease sign in to update your profile.\n\nThank you for shipping with us!`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed' | 'timeout', metadata?: any) => {
            await adminDb.collection('sent_emails').add({
                recipientName, 
                recipientEmail, 
                subject, 
                body: emailBody, 
                status, 
                messageId: metadata?.messageId || null,
                error: metadata?.error || null, 
                sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            console.warn('[RESET PASSWORD] SMTP Configuration incomplete. Logging simulation.');
            await logEmail('simulated');
            return NextResponse.json({ success: true, simulated: true });
        }

        // Dispatch Email with internal timeout
        try {
            const transporter = nodemailer.createTransport({
                pool: false,
                host: host, 
                port: Number(port), 
                secure: Number(port) === 465,
                auth: { user: user, pass: pass }, 
                tls: { rejectUnauthorized: false },
                connectionTimeout: 8000, // Strict 8s for handshake
                socketTimeout: 8000,
                greetingTimeout: 5000
            });

            // We don't await this fully if it's too slow, but for reset we want to try
            const mailPromise = transporter.sendMail({
                from: `"FromStore2Door Global Logistics" <${user}>`,
                to: recipientEmail, 
                subject: subject, 
                text: emailBody,
            });

            // Race against a 10s timeout to prevent API hang
            const info = await Promise.race([
                mailPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 10000))
            ]) as any;

            console.log('[RESET PASSWORD] Dispatch Success:', info.messageId);
            await logEmail('sent', { messageId: info.messageId });
            return NextResponse.json({ success: true });

        } catch (mailErr: any) {
            console.error('[ADMIN RESET SMTP ERROR]:', mailErr.message);
            const status = mailErr.message === 'SMTP_TIMEOUT' ? 'timeout' : 'failed';
            await logEmail(status, { error: mailErr.message });
            // STILL RETURN SUCCESS because the password WAS updated
            return NextResponse.json({ success: true, emailError: mailErr.message });
        }

    } catch (error: any) {
        console.error('[RESET PASSWORD FATAL EXCEPTION]:', error.message);
        return NextResponse.json({ success: false, message: 'System Exception: ' + error.message }, { status: 500 });
    }
}