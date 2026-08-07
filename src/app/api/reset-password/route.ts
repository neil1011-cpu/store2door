
import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Secure administrative password reset endpoint.
 * Includes automated email notification and enforces the needsPasswordReset flag.
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

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization required.' }, { status: 401 });
        }
        const idToken = authHeader.substring(7);

        // 1. Verify Administrative Credentials
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (tokenErr: any) {
            console.error('[API] Token verification failed:', tokenErr);
            return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
        }

        const adminUid = decodedToken.uid;
        const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isAdminEmail) {
            return NextResponse.json({ message: 'Access Denied.' }, { status: 403 });
        }
        
        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid payload. Password must be 6+ chars.' }, { status: 400 });
        }

        // 2. Fetch User Identity for correspondence
        let userRecord;
        try {
            userRecord = await adminAuth.getUser(userId);
        } catch (fetchErr: any) {
            return NextResponse.json({ message: 'User not found in authentication registry.' }, { status: 404 });
        }

        const userProfileSnap = await adminDb.collection('users').doc(userId).get();
        const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;
        const recipientName = userProfile?.fullName || userRecord.displayName || 'Valued Customer';
        const recipientEmail = userRecord.email;

        if (!recipientEmail) {
             return NextResponse.json({ message: 'User email not found.' }, { status: 404 });
        }

        // 3. Update Firebase Auth Credentials
        await adminAuth.updateUser(userId, {
            password: newPassword,
        });

        // 4. Force User into Change Password Flow on next login
        await adminDb.collection('users').doc(userId).update({
            needsPasswordReset: true,
            updatedAt: adminField.serverTimestamp()
        }).catch(err => {
            console.warn('[API] Warning: Failed to set needsPasswordReset flag in Firestore:', err);
        });

        // 5. Dispatch Notification Email
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        const senderIdentity = SMTP_USER || 'admin@neilussolutions.com';
        const SENDER_DISPLAY_NAME = "FromStore2Door Global";
        const SENDER_EMAIL_FORMAT = `"${SENDER_DISPLAY_NAME}" <${senderIdentity}>`;

        const subject = 'Your Secure Access Key Has Been Updated';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has updated your secure access key for the FromStore2Door platform.\n\nYour new access credentials are:\nEmail: ${recipientEmail}\nNew Password: ${newPassword}\n\nFor your security, please sign in at your earliest convenience. You will be prompted to update this password in your profile settings upon logging in.\n\nThank you for shipping with us!`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
            try {
                await adminDb.collection('sent_emails').add({
                    recipientName,
                    recipientEmail,
                    subject,
                    body: emailBody,
                    status,
                    error: error || null,
                    sentAt: adminField.serverTimestamp(),
                });
            } catch (dbError) {
                console.error("[EMAIL LOG ERROR]:", dbError);
            }
        };

        const isPlaceholder = !SMTP_PASS || SMTP_PASS.includes('xxxx');
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || isPlaceholder) {
            console.warn("[RESET PASSWORD] SMTP not configured. Simulation mode engaged.");
            await logEmail('simulated');
            return NextResponse.json({ 
                success: true, 
                message: 'Password updated. Email delivery simulated (check history).',
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
            console.error(mailErr.stack);
            await logEmail('failed', mailErr.message);
            // We return success: true because the password WAS updated in Auth registry
            return NextResponse.json({ 
                success: true, 
                message: 'Password updated but email delivery failed. Please notify the user manually.',
                emailError: mailErr.message 
            });
        }

        return NextResponse.json({ success: true, message: 'Password updated and notification dispatched.' });

    } catch (error: any) {
        console.error('[API FATAL] Reset Password Failure:', error);
        console.error(error.stack);
        return NextResponse.json({ success: false, message: error.message || 'Internal server error.' }, { status: 500 });
    }
}
