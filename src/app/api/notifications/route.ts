import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import type { PreAlert, Shipment } from '@/lib/types';

/**
 * @fileOverview API to fetch recent activity for the admin dashboard.
 * Utilizes centralized Firebase Admin instance.
 */

export async function GET() {
  try {
    const notifications: any[] = [];

    // 1. Recent Pre-Alerts
    const preAlertsSnapshot = await adminDb
      .collectionGroup("pre_alerts")
      .orderBy("submissionDate", "desc")
      .limit(10)
      .get();

    preAlertsSnapshot.forEach(doc => {
      const data = doc.data() as PreAlert;
      if (data.submissionDate) {
        notifications.push({
          id: `pa-${doc.id}`,
          type: "pre-alert",
          title: `New Pre-Alert: ${data.trackingNumber}`,
          description: `${data.customerName} notified us of an incoming package.`,
          timestamp: data.submissionDate.toDate().toISOString(),
          href: "/admin/pre-alerts"
        });
      }
    });

    // 2. Recent Shipment Movements
    const shipmentsSnapshot = await adminDb
      .collectionGroup("shipments")
      .orderBy("shippingDate", "desc")
      .limit(10)
      .get();

    shipmentsSnapshot.forEach(doc => {
      const data = doc.data() as Shipment;
      if (data.shippingDate) {
         notifications.push({
            id: `ship-${doc.id}`,
            type: 'status-update',
            title: `Update: ${data.status}`,
            description: `Package ${data.trackingNumber} moved to "${data.status}".`,
            timestamp: data.shippingDate.toDate().toISOString(),
            href: '/admin/shipping',
        });
      }
    });

    // 3. Aggregate and Sort
    const finalNotifications = notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

    return NextResponse.json(finalNotifications);

  } catch (error: any) {
    console.error('Notification API Error:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve notifications' },
      { status: 500 }
    );
  }
}
