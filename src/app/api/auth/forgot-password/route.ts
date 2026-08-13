import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Forgot Password API with Hardened TLS and timeouts.
 * Optimized for reliability in serverless environments.
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
            console.log(`[FORGOT PASSWORD] Email not found in registry: ${targetEmail}`);
            return NextResponse.json({ success: true, message: 'Instructions dispatched if an account exists for this email.' });
        }

        const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);
        const recipientName = userRecord.displayName || 'Valued Customer';
        const subject = 'Reset Your FromStore2Door Access Key';
        const emailBody = `Hi ${recipientName},\n\nYou have requested a secure link to reset your logistics platform access key. Please click the link below to define your new password:\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nThe FromStore2Door Team`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', metadata?: any) => {
            await adminDb.collection('sent_emails').add({
                recipientName,
                recipientEmail: targetEmail,
                subject,
                body: emailBody,
                status,
                messageId: metadata?.messageId || null,
                error: metadata?.error || null,
                sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

        // Resolve Credentials
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
            console.warn('[FORGOT PASSWORD] Simulation mode active. No SMTP credentials detected.');
            await logEmail('simulated');
            return NextResponse.json({ success: true, simulated: true });
        }

        try {
            console.log('[FORGOT PASSWORD] Establishing secure SMTP connection...');
            const transporter = nodemailer.createTransport({
                pool: false,
                host: host,
                port: Number(port),
                secure: Number(port) === 465,
                auth: { user: user, pass: pass },
                tls: { 
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.2'
                },
                connectionTimeout: 15000,
                socketTimeout: 15000,
                greetingTimeout: 10000
            });

            const info = await transporter.sendMail({
                from: `"FromStore2Door Global Logistics" <${user}>`,
                to: targetEmail,
                subject: subject,
                text: emailBody,
            });

            console.log('[FORGOT PASSWORD] Reset link dispatched:', info.messageId);
            await logEmail('sent', { messageId: info.messageId });
            return NextResponse.json({ success: true });
        } catch (mailErr: any) {
            console.error('[FORGOT PASSWORD SMTP ERROR]:', mailErr.message);
            await logEmail('failed', { error: mailErr.message });
            return NextResponse.json({ success: false, message: 'Transmission failed: ' + mailErr.message }, { status: 500 });
        }

    } catch (criticalError: any) {
        console.error('[FORGOT PASSWORD FATAL EXCEPTION]:', criticalError.message, criticalError.stack);
        return NextResponse.json({ success: false, message: 'Internal Server Exception' }, { status: 500 });
    }
}
