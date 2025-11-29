
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// NOTE: This assumes the 'from' email address has been verified in your Resend account.
// Resend requires domain verification for production use. For testing, you can send
// from 'onboarding@resend.dev', but all emails will be delivered to your own verified email.
const RESEND_FROM_EMAIL = 'onboarding@resend.dev';

export async function POST(request: Request) {
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ message: 'Email sending is not configured. RESEND_API_KEY is missing.' }, { status: 501 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    try {
        const { to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required fields: to, subject, and body.' }, { status: 400 });
        }
        
        // In a real application, you'd likely use a nicely formatted HTML template
        const { data, error } = await resend.emails.send({
            from: `FromStore2Door <${RESEND_FROM_EMAIL}>`,
            to: [to],
            subject: subject,
            text: body, // Using text for simplicity, but you can use `react: <EmailTemplate />`
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json({ message: 'Failed to send email.', error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Email sent successfully!', data });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.', error: (error as Error).message }, { status: 500 });
    }
}
