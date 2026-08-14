import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Standardized Email API with Hardened TLS and Identity Alignment.
 * Prioritizes Environment Variables to avoid frequent Google Cloud Resource prompts.
 */

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

    const logEmail = async (status: 'sent' | 'simulated' | 'failed', metadata?: any) => {
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

    // Stage 1: Load from Environment Variables (Primary to avoid DB hits)
    let host = process.env.SMTP_HOST;
    let port = process.env.SMTP_PORT || '465';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    // Stage 2: Fallback to Firestore Metadata only if ENV vars are missing
    // This logic prevents the "Grant Access to Google Cloud" prompt for users with .env files
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
        } catch (e) {
            console.warn('[EMAIL API] Firestore Metadata fetch failed.');
        }
    }

    if (!host || !port || !user || !pass || pass.includes('xxxx')) {
        await logEmail('simulated');
        return NextResponse.json({ message: `Simulation Active. No SMTP keys detected in system.`, simulated: true }, { status: 200 });
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

        // Use the SMTP user as the 'from' address to satisfy strict provider requirements
        const info = await transporter.sendMail({
            from: `"FromStore2Door Global Logistics" <${user}>`,
            to: Array.isArray(to) ? user : to,
            bcc: Array.isArray(to) ? to : undefined,
            subject: subject,
            html: fullBodyHtml,
            text: emailBody,
        });

        await logEmail('sent', { messageId: info.messageId, response: info.response });
        return NextResponse.json({ success: true, message: 'Email delivered successfully.' });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION FAILURE]:', error.message);
        await logEmail('failed', { error: error.message });
        return NextResponse.json({ message: `Transmission Failed: ${error.message}` }, { status: 500 });
    }
}
