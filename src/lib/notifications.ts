'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { sendAppEmail, type EmailConfig } from '@/lib/integrations/email-service';

/**
 * @fileOverview Automated Notification Engine.
 * Dispatches lifecycle alerts to customers based on shipment status transitions.
 */

const NOTIFIABLE_STATUSES = [
    'Received in Florida Warehouse',
    'Ready for pick up'
];

interface NotificationInput {
    recipientEmail: string;
    recipientName: string;
    trackingNumber: string;
    status: string;
    oldStatus: string | null;
}

/**
 * Evaluates and dispatches a status update email.
 * Ensures notifications are only sent for critical transitions and strictly once per state.
 */
export async function triggerStatusNotification(input: NotificationInput): Promise<void> {
    const { recipientEmail, recipientName, trackingNumber, status, oldStatus } = input;

    // 1. Logic Gate: Only notify for specific app statuses
    if (!NOTIFIABLE_STATUSES.includes(status)) return;

    // 2. Logic Gate: Only notify if the status has actually changed
    if (status === oldStatus) return;

    try {
        const adminClient = await createAdminClient();

        // 3. Retrieve SMTP Configuration from Registry
        const { data: configDoc } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'email_config')
            .maybeSingle();
        
        const config = configDoc?.config_value as EmailConfig | undefined;

        if (!config?.host || !config?.user || !config?.pass) {
            console.warn(`[NOTIFICATION_SKIPPED] SMTP not configured for ${trackingNumber}`);
            return;
        }

        // 4. Construct Content (Strictly no pricing/amounts)
        const subject = `Package Update: ${trackingNumber}`;
        const body = `Hi ${recipientName},\n\nYour package with tracking number ${trackingNumber} has been updated to the following status:\n\n${status}\n\nYou can view more details by signing into your dashboard.\n\nThank you for choosing FromStore2Door.`;

        // 5. Dispatch
        await sendAppEmail(config, recipientEmail, subject, body);

        // 6. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: 'automated_notification',
            description: `Status alert dispatched to ${recipientEmail} for ${trackingNumber} (${status})`,
            metadata: { trackingNumber, status, recipientEmail }
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[NOTIFICATION_FAILURE] Tracking: ${trackingNumber}, Error: ${msg}`);
    }
}
