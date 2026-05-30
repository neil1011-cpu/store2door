import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Standardized Email API with Dynamic SMTP support.
 * Uses SMTP_USER from .env as the primary sender address.
 */

export async function POST(request: Request) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const { to, subject, body, recipientName } = await request.json();

    const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
        try {
            await adminDb.collection('sent_emails').add({
                recipientName: recipientName || (Array.isArray(to) ? `Multiple (${to.length})` : to),
                recipientEmail: Array.isArray(to) ? to.join(', ') : to,
                subject,
                body,
                status,
                error: error || null,
                sentAt: serverTimestamp(),
            });
        } catch (dbError) {
            console.error("[EMAIL LOG ERROR]:", dbError);
        }
    };

    // Dynamically use the configured SMTP user as the sender email
    const SENDER_EMAIL = `"FromStore2Door" <${SMTP_USER || 'admin@neilussolutions.com'}>`;

    // If SMTP is not configured, we run in SIMULATION MODE
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.warn("--- EMAIL SIMULATION MODE ACTIVE ---");
        console.log(`TO: ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log("-------------------------------------");
        
        await logEmail('simulated');
        return NextResponse.json({ 
            message: 'Email processed in simulation mode. Fill in SMTP credentials in .env to send real emails.',
            simulated: true 
        });
    }

    try {
        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required email fields' }, { status: 400 });
        }
        
        const signatureHtml = `
            <br><br>
            <p>--</p>
            <p>Best regards,</p>
            <p><b>The FromStore2Door Team</b></p>
            <p><a href="mailto:${SMTP_USER}">${SMTP_USER}</a></p>
        `;

        const fullBodyHtml = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;"><p>${body.replace(/\n/g, "<br>")}</p>${signatureHtml}</div>`;

        // Configure Transporter
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: SENDER_EMAIL,
            replyTo: SMTP_USER,
            subject: subject,
            text: body + `\n\n--\nBest regards,\nThe FromStore2Door Team\n${SMTP_USER}`,
            html: fullBodyHtml,
        };

        if (Array.isArray(to)) {
            mailOptions.to = `"Undisclosed Recipients" <${SMTP_USER}>`;
            mailOptions.bcc = to;
        } else {
            mailOptions.to = to;
        }

        await transporter.sendMail(mailOptions);
        await logEmail('sent');

        return NextResponse.json({ message: 'Email sent successfully!' });

    } catch (error: any) {
        console.error('[SMTP FATAL ERROR]:', error);
        await logEmail('failed', error.message);
        return NextResponse.json({ 
            message: 'Failed to transmit email. If using Gmail, ensure you are using an App Password.', 
            error: error.message 
        }, { status: 500 });
    }
}
