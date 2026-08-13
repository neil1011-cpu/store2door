import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Now generates a secure Firebase Reset Link instead of a manual password.
 * Optimized for speed: Returns response immediately after generating the link.
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
        const { userId } = body;

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
        
        if (!userId) {
            return NextResponse.json({ message: 'Target user ID is required.' }, { status: 400 });
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

        // 1. GENERATE SECURE RESET LINK
        const resetLink = await adminAuth.generatePasswordResetLink(recipientEmail);

        // 2. FLAG PROFILE (Non-Fatal)
        adminDb.collection('users').doc(userId).update({
            needsPasswordReset: true,
            updatedAt: adminField.serverTimestamp()
        }).catch(() => {});

        // 3. PREPARE EMAIL TASK
        const subject = 'Action Required: Reset Your Logistics Access Key';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has initiated a security update for your FromStore2Door account. Please click the link below to set your new secure access key:\n\n${resetLink}\n\nThis link will expire for your protection.\n\nThank you for shipping with us!`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed' | 'timeout') => {
            await adminDb.collection('sent_emails').add({
                recipientName, 
                recipientEmail, 
                subject, 
                body: emailBody, 
                status, 
                sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

        // 4. RESOLVE CREDENTIALS
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

        // 5. RESPOND IMMEDIATELY TO UI
        // We trigger the email dispatch but don't await it to prevent timeouts.
        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            logEmail('simulated');
            return NextResponse.json({ success: true, simulated: true });
        }

        // Background dispatch
        const dispatchEmail = async () => {
            try {
                const transporter = nodemailer.createTransport({
                    pool: false,
                    host: host, 
                    port: Number(port), 
                    secure: Number(port) === 465,
                    auth: { user: user, pass: pass }, 
                    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
                    connectionTimeout: 10000,
                    socketTimeout: 10000
                });

                await transporter.sendMail({
                    from: `"FromStore2Door Global Logistics" <${user}>`,
                    to: recipientEmail, 
                    subject: subject, 
                    text: emailBody,
                    html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
                        <h2 style="color:#0d6efd;font-style:italic;">FROMSTORE2DOOR</h2>
                        <p>Hi ${recipientName},</p>
                        <p>Your administrator has initiated a security update. Click the button below to set your new access key:</p>
                        <div style="margin:30px 0;"><a href="${resetLink}" style="background:#0d6efd;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Reset Access Key</a></div>
                        <p style="font-size:12px;color:#888;">If the button doesn't work, copy and paste this link: <br>${resetLink}</p>
                    </div>`
                });
                await logEmail('sent');
            } catch (err: any) {
                console.error('[RESET EMAIL BACKGROUND ERROR]:', err.message);
                await logEmail('failed');
            }
        };

        // Trigger dispatch without await
        dispatchEmail();

        return NextResponse.json({ success: true, message: 'Reset link generated and dispatch initiated.' });

    } catch (error: any) {
        console.error('[RESET PASSWORD FATAL EXCEPTION]:', error.message);
        return NextResponse.json({ success: false, message: 'System Exception: ' + error.message }, { status: 500 });
    }
}