
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Standardized Email API with Dynamic SMTP support.
 * Includes detailed environment diagnostics to debug Simulation Mode in live environments.
 */

export async function POST(request: Request) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const { to, subject, body: emailBody, recipientName } = body;

    const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
        try {
            await adminDb.collection('sent_emails').add({
                recipientName: recipientName || (Array.isArray(to) ? `Multiple (${to.length})` : to),
                recipientEmail: Array.isArray(to) ? to.join(', ') : to,
                subject: subject || '(No Subject)',
                body: emailBody || '(No Body)',
                status,
                error: error || null,
                sentAt: adminField.serverTimestamp(),
            });
        } catch (dbError) {
            console.error("[EMAIL LOG ERROR]:", dbError);
        }
    };

    // Diagnostics for Simulation Mode
    const missingKeys = [];
    if (!SMTP_HOST) missingKeys.push('SMTP_HOST');
    if (!SMTP_PORT) missingKeys.push('SMTP_PORT');
    if (!SMTP_USER) missingKeys.push('SMTP_USER');
    if (!SMTP_PASS || SMTP_PASS.includes('xxxx')) missingKeys.push('SMTP_PASS (or using placeholder)');

    if (missingKeys.length > 0) {
        console.warn(`[EMAIL] Simulation Mode engaged. Missing/Placeholder keys: ${missingKeys.join(', ')}`);
        await logEmail('simulated');
        return NextResponse.json({ 
            message: `Simulation Active. Missing: ${missingKeys.join(', ')}. Set these in your hosting environment variables.`,
            simulated: true 
        }, { status: 200 });
    }

    // Official Identity
    const senderIdentity = SMTP_USER;
    const SENDER_DISPLAY_NAME = "FromStore2Door Global";
    const SENDER_EMAIL_FORMAT = `"${SENDER_DISPLAY_NAME}" <${senderIdentity}>`;

    try {
        if (!to || !subject || !emailBody) {
            return NextResponse.json({ message: 'Target email, subject, and body are required.' }, { status: 400 });
        }
        
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
                    <p style="font-size: 0.8em; margin-top: 20px; opacity: 0.6;">This is an automated system notification. Please do not reply directly to this dispatch.</p>
                </div>
            </div>
        `;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: SENDER_EMAIL_FORMAT,
            replyTo: senderIdentity,
            subject: subject,
            html: fullBodyHtml,
            text: emailBody,
        };

        if (Array.isArray(to)) {
            mailOptions.to = `"${SENDER_DISPLAY_NAME} Clients" <${senderIdentity}>`;
            mailOptions.bcc = to;
        } else {
            mailOptions.to = to;
        }

        await transporter.sendMail(mailOptions);
        await logEmail('sent');

        return NextResponse.json({ success: true, message: 'Email delivered successfully.' });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION FAILURE]:', error);
        await logEmail('failed', error.message);
        return NextResponse.json({ message: `SMTP Failed: ${error.message}` }, { status: 500 });
    }
}
