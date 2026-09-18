
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Production Notification API (Supabase).
 * Aggregates recent pre-alerts and shipment updates from PostgreSQL.
 */

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const notifications: any[] = [];

    // 1. Fetch Recent Pre-Alerts
    const { data: preAlerts } = await supabase
        .from('pre_alerts')
        .select('*, profiles(full_name)')
        .order('submission_date', { ascending: false })
        .limit(10);

    (preAlerts || []).forEach(pa => {
        notifications.push({
            id: `pa-${pa.id}`,
            type: 'pre-alert',
            title: `New Pre-Alert: ${pa.tracking_number}`,
            description: `${pa.profiles?.full_name} reported an incoming package.`,
            timestamp: pa.submission_date,
            href: '/admin/pre-alerts'
        });
    });

    // 2. Fetch Recent Shipment Updates
    const { data: shipments } = await supabase
        .from('shipments')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

    (shipments || []).forEach(s => {
        notifications.push({
            id: `ship-${s.id}`,
            type: 'status-update',
            title: `Update: ${s.status}`,
            description: `Package ${s.tracking_number} moved to state "${s.status}".`,
            timestamp: s.created_at,
            href: '/admin/shipping'
        });
    });

    // 3. Global Feed Sort
    const finalFeed = notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

    return NextResponse.json(finalFeed);

  } catch (error: any) {
    console.error('Notification API Failure:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
