import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminField } from '@/lib/firebaseAdmin';

/**
 * @fileOverview Standardized Email API with Firestore Fallback for SMTP credentials.
 */

export async function POST(request: Request) {
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

    // 1. Resolve Credentials (ENV -> Firestore Metadata)
    let host = process.env.SMTP_HOST;
    let port = process.env.SMTP_PORT;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    const isEnvValid = host && port && user && pass && !pass.includes('xxxx');

    if (!isEnvValid) {
        try {
            const configSnap = await adminDb.collection('metadata').doc('email_config').get();
            if (configSnap.exists) {
                const data = configSnap.data();
                host = data?.host || host;
                port = data?.port || port;
                user = data?.user || user;
                pass = data?.pass || pass;
            }
        } catch (dbErr) {
            console.error('[API] Error fetching SMTP config from Firestore:', dbErr);
        }
    }

    const missingKeys = [];
    if (!host) missingKeys.push('host');
    if (!port) missingKeys.push('port');
    if (!user) missingKeys.push('user');
    if (!pass || pass.includes('xxxx')) missingKeys.push('pass');

    if (missingKeys.length > 0) {
        console.warn(`[EMAIL] Simulation Mode. Missing: ${missingKeys.join(', ')}`);
        await logEmail('simulated');
        return NextResponse.json({ 
            message: `Simulation Active. Configure SMTP in Settings. Missing: ${missingKeys.join(', ')}`,
            simulated: true 
        }, { status: 200 });
    }

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
                    <p style="font-size: 0.8em; margin-top: 20px; opacity: 0.6;">This is an automated system notification. Please do not reply directly.</p>
                </div>
            </div>
        `;

        const transporter = nodemailer.createTransport({
            host: host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: { user: user, pass: pass },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: `"${recipientName || 'FromStore2Door'}" <${user}>`,
            to: Array.isArray(to) ? undefined : to,
            bcc: Array.isArray(to) ? to : undefined,
            subject: subject,
            html: fullBodyHtml,
            text: emailBody,
        };

        await transporter.sendMail(mailOptions);
        await logEmail('sent');

        return NextResponse.json({ success: true, message: 'Email delivered successfully.' });

    } catch (error: any) {
        console.error('[SMTP TRANSMISSION FAILURE]:', error);
        await logEmail('failed', error.message);
        return NextResponse.json({ message: `SMTP Failed: ${error.message}` }, { status: 500 });
    }
}
