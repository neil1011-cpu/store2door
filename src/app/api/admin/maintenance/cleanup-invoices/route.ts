import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Maintenance API: 30-Day Document Retention Policy.
 * Identifies and purges expired binary assets from PostgreSQL Registry.
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

        let purgedCount = 0;

        // 2. Sequential Registry Purge
        for (const alert of expiredAlerts) {
            try {
                const assetId = alert.invoice_url;

                // A. Delete from binary documentation registry
                const { error: deleteError } = await adminClient
                    .from('document_assets')
                    .delete()
                    .eq('id', assetId);

                if (deleteError) {
                    console.warn(`[MAINTENANCE] Asset ${assetId} not found or already purged.`);
                }

                // B. Nullify reference in the pre-alert record
                await adminClient
                    .from('pre_alerts')
                    .update({ invoice_url: null })
                    .eq('id', alert.id);

                purgedCount++;
            } catch (err: any) {
                console.error(`[MAINTENANCE] Failed to fully purge assets for alert ${alert.id}:`, err.message);
            }
        }

        // 3. System Log
        await adminClient.from('system_logs').insert({
            log_type: 'retention_cleanup',
            description: `Automated maintenance: Purged ${purgedCount} expired documentation assets from DB registry.`,
            metadata: { purgedCount, timestamp: new Date().toISOString() }
        });

        return NextResponse.json({ success: true, purgedCount });

    } catch (error: any) {
        console.error("[API:MAINTENANCE:CLEANUP] FATAL:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}