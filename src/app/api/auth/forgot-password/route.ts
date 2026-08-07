import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Forgot Password API with Firestore SMTP fallback.
 */

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ success: false, message: 'Invalid JSON.' }, { status: 400 });
        }

        const { email } = body;
        if (!email) return NextResponse.json({ success: false, message: 'Email required.' }, { status: 400 });

        const targetEmail = String(email).trim().toLowerCase();

        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(targetEmail);
        } catch (err: any) {
            return NextResponse.json({ success: true, message: 'Instructions dispatched if account exists.' });
        }

        const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);
        const recipientName = userRecord.displayName || 'Valued Customer';
        const subject = 'Reset Your FromStore2Door Access Key';
        const emailBody = `Hi ${recipientName},\n\nYou can reset your access key using the link below:\n\n${resetLink}`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail: targetEmail, subject, body: emailBody, status, error: error || null, sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

        // Resolve SMTP
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

        try {
            const transporter = nodemailer.createTransport({
                host: host, port: Number(port), secure: Number(port) === 465,
                auth: { user: user, pass: pass }, tls: { rejectUnauthorized: false }
            });

            await transporter.sendMail({
                from: `"FromStore2Door" <${user}>`,
                to: targetEmail, subject: subject, text: emailBody,
            });

            await logEmail('sent');
            return NextResponse.json({ success: true });
        } catch (mailErr: any) {
            await logEmail('failed', mailErr.message);
            return NextResponse.json({ success: false, message: 'Transmission failed.' }, { status: 500 });
        }

    } catch (criticalError: any) {
        return NextResponse.json({ success: false, message: 'Internal error.' }, { status: 500 });
    }
}
