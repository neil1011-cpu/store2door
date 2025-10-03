
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
    try {
        const { html } = await request.json();

        if (!html) {
            return NextResponse.json({ message: 'HTML content is required.' }, { status: 400 });
        }

        const browser = await puppeteer.launch({ 
            headless: true,
            // Necessary for running in environments like Vercel or Cloud Functions
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        await browser.close();

        const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

        return NextResponse.json({ pdf: pdfDataUri });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ message: 'Failed to generate PDF.', error: (error as Error).message }, { status: 500 });
    }
}

    