import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAppEmail, EmailConfig } from '@/lib/integrations/email-service';

/**
 * @fileOverview Production Email Dispatcher.
 * Refactored to use the centralized EmailService and System Registry.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, body: emailBody, recipientName } = body;

        const adminClient = await createAdminClient();

        // 1. Fetch Auth Config from Registry
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'email_config')
            .maybeSingle();
        
        const config = configDoc?.config_value as EmailConfig;

        if (!config?.host || !config?.user || !config?.pass) {
            console.warn('[EMAIL API] SMTP unconfigured. Audit logging simulation.');
            await adminClient.from('sent_emails').insert({
                recipient_email: Array.isArray(to) ? to.join(', ') : to,
                recipient_name: recipientName,
                subject,
                body_content: emailBody,
                status: 'simulated'
            });
            return NextResponse.json({ simulated: true, message: 'Registry SMTP missing. Logged as simulation.' });
        }

        // 2. Dispatch
        await sendAppEmail(config, to, subject, emailBody);

        // 3. Log Audit
        await adminClient.from('sent_emails').insert({
            recipient_email: Array.isArray(to) ? to.join(', ') : to,
            recipient_name: recipientName,
            subject,
            body_content: emailBody,
            status: 'sent'
        });

        return NextResponse.json({ success: true, message: 'Correspondence dispatched.' });

    } catch (error: any) {
        console.error('[SMTP DISPATCH ERROR]:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
