
import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Branded Password Reset API.
 * Generates a secure Firebase reset link and dispatches it via the custom SMTP server.
 */

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
        }

        const { email } = body;

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 });
        }

        const targetEmail = String(email).trim().toLowerCase();

        // 1. Check if user exists (Security best practice: always report success to public, but log internally)
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(targetEmail);
        } catch (err: any) {
            console.warn(`[FORGOT PASSWORD] Reset requested for non-existent email: ${targetEmail}`);
            return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been dispatched.' });
        }

        // 2. Generate Reset Link
        const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);

        // 3. Prepare Email Meta
        const recipientName = userRecord.displayName || 'Valued Customer';
        const subject = 'Reset Your FromStore2Door Access Key';
        const emailBody = `Hi ${recipientName},\n\nWe received a request to reset your password for your FromStore2Door account.\n\nYou can reset your access key by clicking the secure link below:\n\n${resetLink}\n\nThis link will expire for your security. If you did not request this change, you can safely ignore this email.\n\nHappy Shipping!`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
            try {
                await adminDb.collection('sent_emails').add({
                    recipientName,
                    recipientEmail: targetEmail,
                    subject,
                    body: emailBody,
                    status,
                    error: error || null,
                    sentAt: adminField.serverTimestamp(),
                });
            } catch (dbError) {
                console.error("[EMAIL LOG ERROR]:", dbError);
            }
        };

        // 4. Dispatch via SMTP
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        const isPlaceholder = !SMTP_PASS || SMTP_PASS.includes('xxxx');

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || isPlaceholder) {
            console.warn("[FORGOT PASSWORD] SMTP not configured. Simulation mode engaged.");
            await logEmail('simulated');
            return NextResponse.json({ 
                success: true, 
                message: 'Reset link generated (Simulation Mode). check history.',
                simulated: true 
            });
        }

        try {
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure: Number(SMTP_PORT) === 465,
                auth: { user: SMTP_USER, pass: SMTP_PASS },
                tls: { rejectUnauthorized: false }
            });

            const fullBodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #000; font-weight: 900; letter-spacing: -1px; font-style: italic; margin: 0;">FROMSTORE2DOOR</h2>
                        <p style="font-size: 10px; color: #777; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Worldwide Logistics OS</p>
                    </div>
                    <div style="padding: 20px 0; border-top: 2px solid #000;">
                        <p>Hi <b>${recipientName}</b>,</p>
                        <p>We received a request to reset the secure access key for your account.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; font-size: 14px; display: inline-block;">Authorize Reset Now</a>
                        </div>
                        <p style="font-size: 12px; color: #777;">If the button above does not work, copy and paste this URL into your browser:</p>
                        <p style="font-size: 11px; word-break: break-all; color: #0d6efd;">${resetLink}</p>
                    </div>
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; color: #777;">
                        <p>Best regards,<br><b>The FromStore2Door Global Logistics Team</b></p>
                        <p style="font-size: 0.8em; margin-top: 20px; opacity: 0.6;">This link will expire for your security. If you did not request this reset, please ignore this email.</p>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: `"FromStore2Door" <${SMTP_USER}>`,
                to: targetEmail,
                subject: subject,
                html: fullBodyHtml,
                text: emailBody,
            });

            await logEmail('sent');
            return NextResponse.json({ success: true, message: 'Reset instructions dispatched.' });

        } catch (mailErr: any) {
            console.error('[FORGOT PASSWORD MAIL ERROR]:', mailErr);
            console.error(mailErr.stack);
            await logEmail('failed', mailErr.message);
            return NextResponse.json({ success: false, message: 'Transmission failed. Contact support.' }, { status: 500 });
        }

    } catch (criticalError: any) {
        console.error('[API CRITICAL FAILURE] Forgot Password:', criticalError);
        console.error(criticalError.stack);
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
}
