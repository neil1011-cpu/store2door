
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';

function getAdminDB() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  return getFirestore();
}

export async function POST(request: Request) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const { to, subject, body, recipientName } = await request.json();

    const db = getAdminDB();

    const logEmail = async () => {
        if (!db) return;
        try {
            const emailLog = {
                recipientName: recipientName || (Array.isArray(to) ? `Multiple (${to.length})` : to),
                recipientEmail: Array.isArray(to) ? to.join(', ') : to,
                subject,
                body,
                sentAt: serverTimestamp(),
            };
            await db.collection('sent_emails').add(emailLog);
        } catch (error) {
            console.error("Log error:", error);
        }
    };

    // Reverted sender email
    const SENDER_EMAIL = `"FromStore2Door" <admin@neilussolutions.com>`;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.log("--- SIMULATING EMAIL (SMTP not configured) ---");
        console.log(`From: ${SENDER_EMAIL}`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        await logEmail();
        return NextResponse.json({ message: 'Email sent successfully (simulated)!' });
    }

    try {
        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }
        
        const signatureHtml = `
<br><br>
<p>--</p>
<p>Best regards,</p>
<p><b>The FromStore2Door Team</b></p>
<p><a href="mailto:admin@neilussolutions.com">admin@neilussolutions.com</a></p>
`;

        const fullBodyHtml = `<p>${body.replace(/\n/g, "<br>")}</p>${signatureHtml}`;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, 
            auth: { user: SMTP_USER, pass: SMTP_PASS },
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
        await logEmail();

        return NextResponse.json({ message: 'Email sent successfully!' });

    } catch (error: any) {
        console.error('SMTP Error:', error);
        return NextResponse.json({ message: 'Failed to send email.', error: error.message }, { status: 500 });
    }
}
