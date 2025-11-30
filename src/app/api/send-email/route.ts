
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return NextResponse.json({ message: 'Missing required fields: to, subject, and body.' }, { status: 400 });
        }
        
        // Simulate sending an email by logging it to the console
        console.log("--- SIMULATING EMAIL ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${body}`);
        console.log("------------------------");

        // Return a success response as if the email was sent
        return NextResponse.json({ message: 'Email sent successfully! (Simulated)' });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.', error: (error as Error).message }, { status: 500 });
    }
}
