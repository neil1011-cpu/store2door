import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Standardized Email API with Dynamic SMTP support.
 * Optimized for resilience and clear diagnostic feedback.
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
                sentAt: serverTimestamp(),
            });
        } catch (dbError) {
            console.error("[EMAIL LOG ERROR]:", dbError);
        }
    };

    const senderIdentity = SMTP_USER || 'admin@neilussolutions.com';
    const SENDER_EMAIL = `"FromStore2Door" <${senderIdentity}>`;

    // 1. Simulation Check: If config is missing, log and notify the UI
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.warn("[EMAIL] Configuration missing. Simulation mode engaged.");
        await logEmail('simulated');
        return NextResponse.json({ 
            message: 'Email Simulation Active: SMTP environment variables are not configured.',
            simulated: true 
        }, { status: 200 });
    }

    try {
        if (!to || !subject || !emailBody) {
            return NextResponse.json({ message: 'Target email, subject, and body are required.' }, { status: 400 });
        }
        
        const fullBodyHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 10px;">FromStore2Door Notification</h2>
                <div style="padding: 20px 0;">
                    ${emailBody.replace(/\n/g, "<br>")}
                </div>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; color: #777;">
                    <p>Best regards,<br><b>The FromStore2Door Global Logistics Team</b></p>
                    <p style="font-size: 0.8em; margin-top: 20px;">This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `;

        // 2. Transporter Configuration with explicit security overrides
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            tls: {
                // Do not fail on invalid certificates (common in some hosting environments)
                rejectUnauthorized: false
            }
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: SENDER_EMAIL,
            replyTo: senderIdentity,
            subject: subject,
            html: fullBodyHtml,
            text: emailBody,
        };

        if (Array.isArray(to)) {
            mailOptions.to = `"Undisclosed Recipients" <${senderIdentity}>`;
            mailOptions.bcc = to;
        } else {
            mailOptions.to = to;
        }

        // 3. Dispatch
        await transporter.sendMail(mailOptions);
        await logEmail('sent');

        return NextResponse.json({ 
            success: true, 
            message: 'Email delivered successfully via SMTP.' 
        });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION ERROR]:', error);
        await logEmail('failed', error.message);
        return NextResponse.json({ 
            message: `SMTP Transmission Failed: ${error.message}`, 
            error: error.message 
        }, { status: 500 });
    }
}
