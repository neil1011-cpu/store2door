import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * @fileOverview Universal Maintenance API: 30-Day Document Retention Policy.
 * Identifies and purges expired pre-alert invoices from Cloud Storage and Registry.
 */

export async function POST(request: Request) {
    try {
        const adminClient = await createAdminClient();
        
        // 1. Identify Expired Records (> 30 days old)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: expiredAlerts, error: fetchError } = await adminClient
            .from('pre_alerts')
            .select('id, invoice_url')
            .not('invoice_url', 'is', null)
            .lt('submission_date', thirtyDaysAgo.toISOString());

        if (fetchError) throw fetchError;
        if (!expiredAlerts || expiredAlerts.length === 0) {
            return NextResponse.json({ success: true, purgedCount: 0, message: 'Registry is clean.' });
        }

        // 2. Fetch Storage Credentials
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value;
        if (!config?.accessKey || !config?.secretKey || !config?.bucket) {
            throw new Error('Vultr Cloud Storage configuration missing.');
        }

        const s3Client = new S3Client({
            region: 'us-east-1',
            endpoint: `https://${config.endpoint || 'ewr1.vultrobjects.com'}`,
            credentials: {
                accessKeyId: config.accessKey,
                secretKeyId: config.secretKey,
            },
            forcePathStyle: true,
        });

        let purgedCount = 0;

        // 3. Sequential Purge
        for (const alert of expiredAlerts) {
            try {
                // Extract S3 Key from URL (Assuming format: https://bucket.endpoint/key)
                const urlParts = alert.invoice_url.split('/');
                const key = urlParts.slice(3).join('/'); // Skip protocol, bucket, and host segments

                if (key) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: config.bucket,
                        Key: key
                    }));
                }

                // 4. Update Database
                await adminClient
                    .from('pre_alerts')
                    .update({ invoice_url: null })
                    .eq('id', alert.id);

                purgedCount++;
            } catch (err: any) {
                console.error(`[MAINTENANCE] Failed to purge object for alert ${alert.id}:`, err.message);
            }
        }

        // 5. System Log
        await adminClient.from('system_logs').insert({
            log_type: 'retention_cleanup',
            description: `Automated maintenance: Purged ${purgedCount} expired documentation assets.`,
            metadata: { purgedCount, timestamp: new Date().toISOString() }
        });

        return NextResponse.json({ success: true, purgedCount });

    } catch (error: any) {
        console.error("[API:MAINTENANCE:CLEANUP] FATAL:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
