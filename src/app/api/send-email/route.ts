import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Standardized Email API with Automatic Hyperlinking.
 * Optimized for serverless environments with non-blocking dispatch and HTML formatting.
 */

// Helper to convert plain text URLs to clickable links
function linkify(text: string) {
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, '<a href="$1" style="color: #0d6efd; text-decoration: underline;">$1</a>');
}

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
                    ${linkify(emailBody.replace(/\n/g, "<br>"))}
                </div>
            </div>
        `;

        // FIRE AND FORGET DISPATCH
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

                const info = await transporter.sendMail({
                    from: `"FromStore2Door Global Logistics" <${user}>`,
                    to: Array.isArray(to) ? user : to,
                    bcc: Array.isArray(to) ? to : undefined,
                    subject: subject,
                    html: fullBodyHtml,
                    text: emailBody,
                });
                await logEmail('sent', { messageId: info.messageId, response: info.response });
            } catch (err: any) {
                console.error('[SEND-EMAIL BACKGROUND ERROR]:', err.message);
                await logEmail('failed', { error: err.message });
            }
        };

        dispatch();

        return NextResponse.json({ success: true, message: 'Dispatch initiated.' });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION FAILURE]:', error.message);
        return NextResponse.json({ message: `SMTP Error: ${error.message}` }, { status: 500 });
    }
}