
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
    console.warn("Firebase admin credentials not set. Email logging will be skipped.");
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
            console.error("Failed to log email to Firestore:", error);
            // We don't want to fail the email sending if logging fails
        }
    };


    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        try {
            console.log("--- SIMULATING EMAIL (SMTP not configured) ---");
            console.log("This is a mock email. In production, this would be sent to the user.");
            console.log(`From: "FromStore2Door" <info@fromstore2door.com>`);
            if (Array.isArray(to)) {
                 console.log(`To: "Undisclosed Recipients" <info@fromstore2door.com>`);
                 console.log(`Bcc: ${to.length} recipients`);
            } else {
                console.log(`To: ${to}`);
            }
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${body}`);
            console.log("------------------------");
            
            await logEmail();

            return NextResponse.json({ message: 'Email sent successfully (simulated)!' });
        } catch (error) {
            console.error('API Error in send-email (simulation):', error);
            return NextResponse.json({ message: 'An unexpected error occurred during simulation.', error: (error as Error).message }, { status: 500 });
        }
    }

    try {
        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required fields: to, subject, and body.' }, { status: 400 });
        }
        
        const signatureText = `
--
Best regards,
The FromStore2Door Team`;
        
        const signatureHtml = `
<br><br>
<p>--</p>
<p>Best regards,</p>
<p><b>The FromStore2Door Team</b></p>
<img src="https://drive.google.com/uc?export=view&id=1KBo__X7BEK_-bA6S8uYOCTkm0YNxxXhk" alt="FromStore2Door Signature" style="width: 250px; height: auto;" />
`;

        const fullBodyText = body + signatureText;
        const fullBodyHtml = `<p>${body.replace(/\n/g, "<br>")}</p>${signatureHtml}`;


        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, 
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: `"FromStore2Door" <info@fromstore2door.com>`,
            replyTo: 'info@fromstore2door.com',
            subject: subject,
            text: fullBodyText,
            html: fullBodyHtml,
        };

        if (Array.isArray(to)) {
            // When sending to multiple recipients, use BCC to protect privacy
            mailOptions.to = `"Undisclosed Recipients" <info@fromstore2door.com>`;
            mailOptions.bcc = to;
        } else {
            mailOptions.to = to;
        }

        await transporter.sendMail(mailOptions);

        await logEmail();

        return NextResponse.json({ message: 'Email sent successfully!' });

    } catch (error) {
        console.error('API Error in send-email (Nodemailer):', error);
        return NextResponse.json({ message: 'Failed to send email.', error: (error as Error).message }, { status: 500 });
    }
}
