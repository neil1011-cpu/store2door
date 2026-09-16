import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Production Email API integrated with Supabase Sent Emails audit.
 * Standardized to read configuration from the public.system_configs table.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, body: emailBody, recipientName } = body;

        const supabase = await createAdminClient();

        // 1. Fetch Config from Supabase
        const { data: config } = await supabase
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'email_config')
            .maybeSingle();
        
        const host = process.env.SMTP_HOST || config?.config_value?.host;
        const port = process.env.SMTP_PORT || config?.config_value?.port || '465';
        const user = process.env.SMTP_USER || config?.config_value?.user;
        const pass = process.env.SMTP_PASS || config?.config_value?.pass;

        if (!host || !user || !pass) {
            console.warn('[EMAIL API] Missing SMTP configuration. Logging simulation.');
            // Log simulation record for audit
            await supabase.from('sent_emails').insert({
                recipient_email: Array.isArray(to) ? to.join(', ') : to,
                recipient_name: recipientName,
                subject,
                body_content: emailBody,
                status: 'simulated'
            });
            return NextResponse.json({ simulated: true, message: 'SMTP credentials missing. Record logged in audit ledger.' });
        }

        const transporter = nodemailer.createTransport({
            host, 
            port: Number(port), 
            secure: Number(port) === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
            from: `"FromStore2Door" <${user}>`,
            to: Array.isArray(to) ? user : to,
            bcc: Array.isArray(to) ? to : undefined,
            subject,
            text: emailBody,
        });

        // 2. Log Audit in Supabase
        await supabase.from('sent_emails').insert({
            recipient_email: Array.isArray(to) ? to.join(', ') : to,
            recipient_name: recipientName,
            subject,
            body_content: emailBody,
            status: 'sent'
        });

        return NextResponse.json({ success: true, message: 'Correspondence dispatched successfully.' });

    } catch (error: any) {
        console.error('[SMTP ERROR]:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}