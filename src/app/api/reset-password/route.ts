import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Generates a secure Firebase Reset Link and awaits SMTP delivery for serverless stability.
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
            return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
        }

        const adminUid = decodedToken.uid;
        const isMasterEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isMasterEmail) {
            return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
        }
        
        if (!userId) {
            return NextResponse.json({ message: 'Target user ID is required.' }, { status: 400 });
        }

        const userRecord = await adminAuth.getUser(userId);
        const userProfileSnap = await adminDb.collection('users').doc(userId).get();
        const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;
        const recipientName = userProfile?.fullName || userRecord.displayName || 'Valued Customer';
        const recipientEmail = userRecord.email;

        if (!recipientEmail) {
             return NextResponse.json({ message: 'User email not found in authentication record.' }, { status: 404 });
        }

        // 1. GENERATE SECURE RESET LINK
        const resetLink = await adminAuth.generatePasswordResetLink(recipientEmail);

        // 2. FLAG PROFILE
        await adminDb.collection('users').doc(userId).update({
            needsPasswordReset: true,
            updatedAt: adminField.serverTimestamp()
        });

        // 3. RESOLVE CREDENTIALS
        let host = process.env.SMTP_HOST;
        let port = process.env.SMTP_PORT || '465';
        let user = process.env.SMTP_USER;
        let pass = process.env.SMTP_PASS;

        const configSnap = await adminDb.collection('metadata').doc('email_config').get();
        if (configSnap.exists) {
            const data = configSnap.data();
            host = data?.host || host;
            port = data?.port || port;
            user = data?.user || user;
            pass = data?.pass || pass;
        }

        const subject = 'Action Required: Reset Your Logistics Access Key';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has initiated a security update for your FromStore2Door account. Please click the link below to set your new secure access key:\n\n${resetLink}\n\nThis link will expire for your protection.\n\nThank you for shipping with us!`;

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail, subject, body: emailBody, status: 'simulated', sentAt: adminField.serverTimestamp(),
            });
            return NextResponse.json({ success: true, simulated: true, message: 'Simulated reset link generation.' });
        }

        // 4. AWAIT SMTP DISPATCH (Mandatory for serverless stability)
        try {
            const transporter = nodemailer.createTransport({
                host: host, 
                port: Number(port), 
                secure: Number(port) === 465,
                auth: { user: user, pass: pass }, 
                tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
                connectionTimeout: 15000,
                socketTimeout: 15000,
                greetingTimeout: 10000
            });

            await transporter.sendMail({
                from: `"FromStore2Door Global Logistics" <${user}>`,
                to: recipientEmail, 
                subject: subject, 
                text: emailBody,
                html: `
                    <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:600px;margin:auto;">
                        <h2 style="color:#000;font-weight:900;font-style:italic;">FROMSTORE2DOOR</h2>
                        <p>Hi ${recipientName},</p>
                        <p>Your administrator has initiated a security update. Click the button below to set your new access key:</p>
                        <div style="margin:30px 0;text-align:center;">
                            <a href="${resetLink}" style="background:#0d6efd;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">Reset Access Key</a>
                        </div>
                        <p style="font-size:12px;color:#888;">If the button doesn't work, copy and paste this link: <br><a href="${resetLink}">${resetLink}</a></p>
                    </div>`
            });

            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail, subject, body: emailBody, status: 'sent', sentAt: adminField.serverTimestamp(),
            });

            return NextResponse.json({ success: true, message: 'Reset link dispatched to user email.' });
        } catch (mailErr: any) {
            console.error('[RESET MAIL ERROR]:', mailErr.message);
            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail, subject, body: emailBody, status: 'failed', error: mailErr.message, sentAt: adminField.serverTimestamp(),
            });
            return NextResponse.json({ success: true, message: 'Reset authorized in database but email failed: ' + mailErr.message });
        }

    } catch (error: any) {
        console.error('[RESET PASSWORD FATAL EXCEPTION]:', error.message);
        return NextResponse.json({ message: 'System Exception: ' + error.message }, { status: 500 });
    }
}
