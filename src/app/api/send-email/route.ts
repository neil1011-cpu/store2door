import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Standardized Email API with Connection Stabilization.
 * Optimized for serverless environments to prevent connection hangs.
 */

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const { to, subject, body: emailBody, recipientName } = body;

    const logEmail = async (status: 'sent' | 'simulated' | 'failed' | 'timeout', metadata?: any) => {
        try {
            await adminDb.collection('sent_emails').add({
                recipientName: recipientName || (Array.isArray(to) ? `Multiple (${to.length})` : to),
                recipientEmail: Array.isArray(to) ? to.join(', ') : to,
                subject: subject || '(No Subject)',
                body: emailBody || '(No Body)',
                status,
                smtpResponse: metadata?.response || null,
                messageId: metadata?.messageId || null,
                error: metadata?.error || null,
                sentAt: adminField.serverTimestamp(),
            });
        } catch (dbError) {
            console.error("[EMAIL LOG ERROR]:", dbError);
        }
    };

    // Resolve Credentials (ENV -> Firestore Metadata)
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
        return NextResponse.json({ message: `Simulation Active.`, simulated: true }, { status: 200 });
    }

    try {
        if (!to || !subject || !emailBody) {
            return NextResponse.json({ message: 'Required fields missing.' }, { status: 400 });
        }
        
        const fullBodyHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #000; font-weight: 900; letter-spacing: -1px; font-style: italic; margin: 0;">FROMSTORE2DOOR</h2>
                </div>
                <div style="padding: 20px 0; border-top: 2px solid #000;">
                    ${emailBody.replace(/\n/g, "<br>")}
                </div>
            </div>
        `;

        const transporter = nodemailer.createTransport({
            pool: false,
            host: host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: { user: user, pass: pass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
            socketTimeout: 10000
        });

        // For Bulk sends, ensure a TO header is present to satisfy mail servers
        const mailPromise = transporter.sendMail({
            from: `"FromStore2Door Global Logistics" <${user}>`,
            to: Array.isArray(to) ? user : to,
            bcc: Array.isArray(to) ? to : undefined,
            subject: subject,
            html: fullBodyHtml,
            text: emailBody,
        });

        const info = await Promise.race([
            mailPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 15000))
        ]) as any;

        await logEmail('sent', { messageId: info.messageId, response: info.response });
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION FAILURE]:', error.message);
        const status = error.message === 'SMTP_TIMEOUT' ? 'timeout' : 'failed';
        await logEmail(status, { error: error.message });
        return NextResponse.json({ message: `SMTP Error: ${error.message}` }, { status: 500 });
    }
}