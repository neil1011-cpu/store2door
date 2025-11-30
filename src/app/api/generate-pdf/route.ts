
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(request: Request) {
    let browser = null;
    try {
        const { html } = await request.json();

        if (!html) {
            return NextResponse.json({ message: 'HTML content is required.' }, { status: 400 });
        }
        
        // Use sparticuz/chromium with recommended settings for serverless
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

        return NextResponse.json({ pdf: pdfDataUri });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ message: 'Failed to generate PDF.', error: (error as Error).message }, { status: 500 });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}
