
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    // If SMTP credentials are not configured, fall back to simulation.
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        try {
            const { to, subject, body } = await request.json();
            console.log("--- SIMULATING EMAIL (SMTP not configured) ---");
            console.log("This is a mock email. In production, this would be sent to the user.");
            console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${body}`);
            console.log("------------------------");
            return NextResponse.json({ message: 'Email sent successfully! (Simulated)' });
        } catch (error) {
            console.error('API Error in send-email (simulation):', error);
            return NextResponse.json({ message: 'An unexpected error occurred during simulation.', error: (error as Error).message }, { status: 500 });
        }
    }

    // If SMTP credentials ARE configured, use Nodemailer.
    try {
        const { to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required fields: to, subject, and body.' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, // `true` for port 465, `false` for all other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        // The 'to' field can be a single string or an array of strings
        await transporter.sendMail({
            from: `"FromStore2Door" <${SMTP_USER}>`, // Sender address (must be your authenticated user)
            to: to, // List of receivers
            subject: subject, // Subject line
            text: body, // Plain text body
            html: `<p>${body.replace(/\n/g, "<br>")}</p>`, // HTML body
        });

        return NextResponse.json({ message: 'Email sent successfully!' });

    } catch (error) {
        console.error('API Error in send-email (Nodemailer):', error);
        return NextResponse.json({ message: 'Failed to send email.', error: (error as Error).message }, { status: 500 });
    }
}
