
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required fields: to, subject, and body.' }, { status: 400 });
        }
        
        // This is a simulated email service for development.
        // In a real environment, you would use a service like Resend, SendGrid, or AWS SES.
        // The logic to check for process.env.RESEND_API_KEY would go here.
        
        console.log("--- SIMULATING EMAIL ---");
        console.log("This is a mock email. In production, this would be sent to the user.");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${body}`);
        console.log("------------------------");

        // We return a success response as if the email was actually sent.
        return NextResponse.json({ message: 'Email sent successfully! (Simulated)' });

    } catch (error) {
        console.error('API Error in send-email:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.', error: (error as Error).message }, { status: 500 });
    }
}
