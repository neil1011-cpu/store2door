import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebaseAdmin';
import { serverTimestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Standardized Email API with Gmail SMTP support and unified Admin Logging.
 * Reverted admin email association to admin@neilussolutions.com.
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

    const SENDER_EMAIL = `"FromStore2Door" <admin@neilussolutions.com>`;

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
            <p><a href="mailto:admin@neilussolutions.com">admin@neilussolutions.com</a></p>
        `;

        const fullBodyHtml = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;"><p>${body.replace(/\n/g, "<br>")}</p>${signatureHtml}</div>`;

        // Configure Transporter for Gmail or General SMTP
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
            replyTo: 'admin@neilussolutions.com',
            subject: subject,
            text: body + "\n\n--\nBest regards,\nThe FromStore2Door Team",
            html: fullBodyHtml,
        };

        if (Array.isArray(to)) {
            mailOptions.to = `"Undisclosed Recipients" <admin@neilussolutions.com>`;
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