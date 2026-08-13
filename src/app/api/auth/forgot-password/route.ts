import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Forgot Password API with Non-Blocking Dispatch.
 * Returns success to the user immediately after generating the secure link.
 */

export async function POST(request: Request) {
    console.log('[API: FORGOT-PASSWORD] Request received.');
    try {
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
        }

        const { email } = body;
        if (!email) return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 });

        const targetEmail = String(email).trim().toLowerCase();

        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(targetEmail);
        } catch (err: any) {
            return NextResponse.json({ success: true, message: 'Instructions dispatched if an account exists.' });
        }

        const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);
        const recipientName = userRecord.displayName || 'Valued Customer';
        const subject = 'Reset Your FromStore2Door Access Key';
        const emailBody = `Hi ${recipientName},\n\nYou have requested a secure link to reset your logistics platform access key. Please click the link below to define your new password:\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nThe FromStore2Door Team`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed' | 'timeout') => {
            await adminDb.collection('sent_emails').add({
                recipientName,
                recipientEmail: targetEmail,
                subject,
                body: emailBody,
                status,
                sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

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

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            await logEmail('simulated');
            return NextResponse.json({ success: true, simulated: true });
        }

        // BACKGROUND DISPATCH: Return 200 immediately
        const dispatch = async () => {
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
                    to: targetEmail,
                    subject: subject,
                    text: emailBody,
                    html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
                        <h2 style="color:#0d6efd;font-style:italic;">FROMSTORE2DOOR</h2>
                        <p>Hi ${recipientName},</p>
                        <p>Click the button below to reset your access key. This link is valid for 1 hour.</p>
                        <div style="margin:30px 0;"><a href="${resetLink}" style="background:#0d6efd;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Set New Password</a></div>
                        <p style="font-size:12px;color:#888;">Link: ${resetLink}</p>
                    </div>`
                });
                await logEmail('sent');
            } catch (err) {
                console.error('[FORGOT BACKGROUND ERROR]:', err);
                await logEmail('failed');
            }
        };

        dispatch();

        return NextResponse.json({ success: true, message: 'Reset protocol initiated.' });

    } catch (criticalError: any) {
        console.error('[FORGOT PASSWORD FATAL EXCEPTION]:', criticalError.message);
        return NextResponse.json({ success: false, message: 'Internal Server Exception' }, { status: 500 });
    }
}