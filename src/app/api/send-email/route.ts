import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Standardized Email API with Dynamic SMTP support.
 * Reverted to correctly handle SMTP_USER as the dynamic sender identity.
 */

export async function POST(request: Request) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const body = await request.json();
    const { to, subject, body: emailBody, recipientName } = body;

    const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
        try {
            await adminDb.collection('sent_emails').add({
                recipientName: recipientName || (Array.isArray(to) ? `Multiple (${to.length})` : to),
                recipientEmail: Array.isArray(to) ? to.join(', ') : to,
                subject,
                body: emailBody,
                status,
                error: error || null,
                sentAt: serverTimestamp(),
            });
        } catch (dbError) {
            console.error("[EMAIL LOG ERROR]:", dbError);
        }
    };

    // Dynamically use the configured SMTP user as the sender email for Gmail/Custom compatibility
    const senderIdentity = SMTP_USER || 'admin@neilussolutions.com';
    const SENDER_EMAIL = `"FromStore2Door" <${senderIdentity}>`;

    // Simulation Mode if SMTP is not configured
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.warn("--- EMAIL SIMULATION MODE ACTIVE ---");
        await logEmail('simulated');
        return NextResponse.json({ 
            message: 'Email simulation active. Configure .env for real delivery.',
            simulated: true 
        });
    }

    try {
        if (!to || !subject || !emailBody) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        
        const fullBodyHtml = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;"><p>${emailBody.replace(/\n/g, "<br>")}</p><br><br><p>--</p><p>Best regards,<br><b>The FromStore2Door Team</b></p></div>`;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
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

        await transporter.sendMail(mailOptions);
        await logEmail('sent');

        return NextResponse.json({ message: 'Email sent successfully!' });

    } catch (error: any) {
        console.error('[SMTP ERROR]:', error);
        await logEmail('failed', error.message);
        return NextResponse.json({ message: 'Email transmission failed.', error: error.message }, { status: 500 });
    }
}