
import { NextResponse } from 'next/server';
import { initAdminApp } from '@/firebase/admin';
import { collectionGroup, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { PreAlert, Shipment } from '@/lib/types';

type Notification = {
  id: string;
  type: 'pre-alert' | 'status-update';
  title: string;
  description: string;
  isRead: boolean; // This will be handled on the client-side
  timestamp: string;
  href: string;
};

export async function GET() {
  try {
    const { firestore } = initAdminApp();

    const notifications: Notification[] = [];

    // 1. Fetch recent pre-alerts
    const preAlertsQuery = query(
      collectionGroup(firestore, 'pre_alerts'),
      orderBy('submissionDate', 'desc'),
      limit(10)
    );
    const preAlertsSnapshot = await getDocs(preAlertsQuery);

    preAlertsSnapshot.forEach(doc => {
      const data = doc.data() as PreAlert;
      notifications.push({
        id: `pa-${doc.id}`,
        type: 'pre-alert',
        title: `New Pre-Alert: ${data.trackingNumber}`,
        description: `${data.customerName} submitted a pre-alert for "${data.contents}".`,
        isRead: false,
        timestamp: data.submissionDate.toDate().toISOString(),
        href: '/admin/pre-alerts',
      });
    });

    // 2. Fetch recent shipment status updates
    const shipmentsQuery = query(
      collectionGroup(firestore, 'shipments'),
      orderBy('shippingDate', 'desc'),
      limit(10)
    );
    const shipmentsSnapshot = await getDocs(shipmentsQuery);

    shipmentsSnapshot.forEach(doc => {
        const data = doc.data() as Shipment;
        // To avoid redundancy, you might want to filter out 'Processed' shipments
        // if they are created at the same time as a pre-alert is processed.
        // For now, we'll include them.
        notifications.push({
            id: `ship-${doc.id}`,
            type: 'status-update',
            title: `Shipment Update: ${data.status}`,
            description: `Package ${data.trackingNumber} status changed to "${data.status}".`,
            isRead: false,
            timestamp: data.shippingDate.toDate().toISOString(),
            href: '/admin/shipping',
        });
    });

    // 3. Sort all notifications by date, most recent first
    const sortedNotifications = notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // 4. Limit to the last 15 combined notifications
    const finalNotifications = sortedNotifications.slice(0, 15);


    return NextResponse.json(finalNotifications);
  } catch (error: any) {
    console.error('API Error fetching notifications:', error);
    return NextResponse.json(
      { message: 'Failed to fetch notifications', error: error.message },
      { status: 500 }
    );
  }
}
