import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Now includes automated email notification to the customer.
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

        // 1. Get User details for the email
        const userRecord = await adminAuth.getUser(userId);
        const userProfileSnap = await adminDb.collection('users').doc(userId).get();
        const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;
        const recipientName = userProfile?.fullName || userRecord.displayName || 'Valued Customer';
        const recipientEmail = userRecord.email;

        if (!recipientEmail) {
             return NextResponse.json({ message: 'User email not found in registry.' }, { status: 404 });
        }

        // 2. Update the password in Firebase Auth
        await adminAuth.updateUser(userId, {
            password: newPassword,
        });

        // 3. Prepare Notification Email
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        const senderIdentity = SMTP_USER || 'admin@neilussolutions.com';
        const SENDER_DISPLAY_NAME = "FromStore2Door Global";
        const SENDER_EMAIL_FORMAT = `"${SENDER_DISPLAY_NAME}" <${senderIdentity}>`;

        const subject = 'Your Secure Access Key Has Been Updated';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has updated your secure access key for the FromStore2Door platform.\n\nYour new access credentials are:\nEmail: ${recipientEmail}\nNew Password: ${newPassword}\n\nFor your security, please sign in at your earliest convenience and update this password in your profile settings.\n\nThank you for shipping with us!`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
            try {
                await adminDb.collection('sent_emails').add({
                    recipientName,
                    recipientEmail,
                    subject,
                    body: emailBody,
                    status,
                    error: error || null,
                    sentAt: serverTimestamp(),
                });
            } catch (dbError) {
                console.error("[EMAIL LOG ERROR]:", dbError);
            }
        };

        const isPlaceholder = !SMTP_PASS || SMTP_PASS.includes('xxxx');
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || isPlaceholder) {
            console.warn("[RESET PASSWORD] SMTP not configured. Simulating dispatch.");
            await logEmail('simulated');
            return NextResponse.json({ 
                success: true, 
                message: 'Password updated. Delivery simulated in history ledger.',
                simulated: true 
            });
        }

        try {
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure: Number(SMTP_PORT) === 465,
                auth: { user: SMTP_USER, pass: SMTP_PASS },
                tls: { rejectUnauthorized: false }
            });

            const fullBodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #000; font-weight: 900; letter-spacing: -1px; font-style: italic; margin: 0;">FROMSTORE2DOOR</h2>
                        <p style="font-size: 10px; color: #777; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Worldwide Logistics OS</p>
                    </div>
                    <div style="padding: 20px 0; border-top: 2px solid #000;">
                        ${emailBody.replace(/\n/g, "<br>")}
                    </div>
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; color: #777;">
                        <p>Best regards,<br><b>The FromStore2Door Global Logistics Team</b></p>
                        <p style="font-size: 0.8em; margin-top: 20px; opacity: 0.6;">This is an automated system notification regarding your security credentials. Please do not reply.</p>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: SENDER_EMAIL_FORMAT,
                to: recipientEmail,
                subject: subject,
                html: fullBodyHtml,
                text: emailBody,
            });

            await logEmail('sent');
        } catch (mailErr: any) {
            console.error('[RESET PASSWORD MAIL ERROR]:', mailErr);
            await logEmail('failed', mailErr.message);
            // We still return success: true because the password WAS updated in Auth
        }

        return NextResponse.json({ success: true, message: 'Password updated and notification dispatched.' });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
    }
}
