
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, collectionGroup, getDocs, query, orderBy, limit } from "firebase-admin/firestore";
import type { PreAlert, Shipment } from '@/lib/types';

// This function safely initializes the admin app ONLY when called.
// It checks for environment variables to prevent build-time errors.
function getAdminDB() {
  // Check if the required environment variables are available.
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase admin credentials are not set in the environment.');
  }

  // Initialize the app if it hasn't been already.
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  return getFirestore();
}

type Notification = {
  id: string;
  type: 'pre-alert' | 'status-update';
  title: string;
  description: string;
  timestamp: string;
  href: string;
};


export async function GET() {
  try {
    // Initialize the DB inside the handler, not at the module level.
    const db = getAdminDB();

    const notifications: Notification[] = [];

    // 1. PRE ALERTS
    const preAlertsSnapshot = await getDocs(
      query(collectionGroup(db, "pre_alerts"), orderBy("submissionDate", "desc"), limit(10))
    );

    preAlertsSnapshot.forEach(doc => {
      const data = doc.data() as PreAlert;
      if (data.submissionDate) {
        notifications.push({
          id: `pa-${doc.id}`,
          type: "pre-alert",
          title: `New Pre-Alert: ${data.trackingNumber}`,
          description: `${data.customerName} submitted a pre-alert.`,
          timestamp: data.submissionDate.toDate().toISOString(),
          href: "/admin/pre-alerts"
        });
      }
    });

    // 2. SHIPMENTS
    const shipmentsSnapshot = await getDocs(
      query(collectionGroup(db, "shipments"), orderBy("shippingDate", "desc"), limit(10))
    );

    shipmentsSnapshot.forEach(doc => {
      const data = doc.data() as Shipment;
      if (data.shippingDate) {
         notifications.push({
            id: `ship-${doc.id}`,
            type: 'status-update',
            title: `Shipment Update: ${data.status}`,
            description: `Package ${data.trackingNumber} status is now "${data.status}".`,
            timestamp: data.shippingDate.toDate().toISOString(),
            href: '/admin/shipping',
        });
      }
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
    // Do not expose detailed error messages in production
    return NextResponse.json(
      { message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
