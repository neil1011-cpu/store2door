import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAppEmail, EmailConfig } from '@/lib/integrations/email-service';

/**
 * @fileOverview Production Email Dispatcher.
 * Refactored to use the centralized EmailService and System Registry.
 * Includes automated compliance footer with unsubscribe and physical address.
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

        // 2. Automated Compliance Footer (GDPR/CASL/CAN-SPAM)
        const complianceFooter = `
--------------------------------------------------
FromStore2Door Global Logistics
Portmore, St. Catherine, Jamaica
info@fromstore2door.com | (876) 506-9727

This email is intended for ${recipientName || to}. 
You are receiving this because you have an active account or inquiry with FromStore2Door.

To unsubscribe or manage your communication preferences, please sign in to your dashboard at: 
${process.env.NEXT_PUBLIC_SITE_URL || 'https://fromstore2door.com'}/account/profile
`;

        const finalBody = `${emailBody}\n\n${complianceFooter}`;

        if (!config?.host || !config?.user || !config?.pass) {
            console.warn('[EMAIL API] SMTP unconfigured. Audit logging simulation.');
            await adminClient.from('sent_emails').insert({
                recipient_email: Array.isArray(to) ? to.join(', ') : to,
                recipient_name: recipientName,
                subject,
                body_content: finalBody,
                status: 'simulated'
            });
            return NextResponse.json({ simulated: true, message: 'Registry SMTP missing. Logged as simulation.' });
        }

        // 3. Dispatch
        await sendAppEmail(config, to, subject, finalBody);

        // 4. Log Audit
        await adminClient.from('sent_emails').insert({
            recipient_email: Array.isArray(to) ? to.join(', ') : to,
            recipient_name: recipientName,
            subject,
            body_content: finalBody,
            status: 'sent'
        });

        return NextResponse.json({ success: true, message: 'Correspondence dispatched.' });

    } catch (error: any) {
        console.error('[SMTP DISPATCH ERROR]:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
