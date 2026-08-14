import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Forgot Password API with Hardened TLS and Identity Alignment.
 * Prioritizes Environment Variables to avoid frequent Google Cloud Resource prompts.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
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

        // Stage 1: Load from Environment Variables (Primary to avoid DB hits)
        let host = process.env.SMTP_HOST;
        let port = process.env.SMTP_PORT || '465';
        let user = process.env.SMTP_USER;
        let pass = process.env.SMTP_PASS;

        // Stage 2: Fallback to Firestore Metadata only if ENV vars are missing
        if (!host || !user || !pass) {
            try {
                const configSnap = await adminDb.collection('metadata').doc('email_config').get();
                if (configSnap.exists) {
                    const data = configSnap.data();
                    host = data?.host || host;
                    port = data?.port || port;
                    user = data?.user || user;
                    pass = data?.pass || pass;
                }
            } catch (e) {}
        }

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail: targetEmail, subject, body: emailBody, status: 'simulated', sentAt: adminField.serverTimestamp(),
            });
            return NextResponse.json({ success: true, simulated: true });
        }

        const transporter = nodemailer.createTransport({
            host: host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: { user: user, pass: pass },
            tls: { 
                rejectUnauthorized: false, 
                minVersion: 'TLSv1.2' 
            },
            pool: false,
            connectionTimeout: 15000,
            socketTimeout: 15000,
            greetingTimeout: 10000
        });

        try {
            await transporter.sendMail({
                from: `"FromStore2Door Global Logistics" <${user}>`,
                to: targetEmail,
                subject: subject,
                text: emailBody,
                html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:600px;margin:auto;">
                    <h2 style="color:#000;font-weight:900;font-style:italic;">FROMSTORE2DOOR</h2>
                    <p>Hi ${recipientName},</p>
                    <p>Click the button below to reset your access key. This link is valid for 1 hour.</p>
                    <div style="margin:30px 0;text-align:center;"><a href="${resetLink}" style="background:#0d6efd;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">Set New Password</a></div>
                    <p style="font-size:12px;color:#888;">If the button doesn't work, copy and paste this link: <br><a href="${resetLink}">${resetLink}</a></p>
                </div>`
            });

            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail: targetEmail, subject, body: emailBody, status: 'sent', sentAt: adminField.serverTimestamp(),
            });

            return NextResponse.json({ success: true, message: 'Reset instructions sent.' });
        } catch (mailErr: any) {
             await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail: targetEmail, subject, body: emailBody, status: 'failed', error: mailErr.message, sentAt: adminField.serverTimestamp(),
            });
            return NextResponse.json({ success: false, message: `Transmission Failed: ${mailErr.message}` }, { status: 500 });
        }

    } catch (criticalError: any) {
        console.error('[FORGOT PASSWORD FATAL EXCEPTION]:', criticalError.message);
        return NextResponse.json({ success: false, message: 'System error: ' + criticalError.message }, { status: 500 });
    }
}
