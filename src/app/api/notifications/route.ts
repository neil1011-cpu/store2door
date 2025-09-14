
import { NextResponse } from 'next/server';

type Notification = {
  id: string;
  type: 'pre-alert' | 'status-update';
  title: string;
  description: string;
  isRead: boolean;
  timestamp: string;
  href: string;
};

// Mock data simulating notifications from iPack or other systems
const notifications: Notification[] = [
  {
    id: '1',
    type: 'status-update',
    title: 'Package Arrived at Warehouse',
    description: 'Package JM789 from John Smith has arrived at the Florida warehouse.',
    isRead: false,
    timestamp: new Date().toISOString(),
    href: '/admin/shipping'
  },
  {
    id: '2',
    type: 'pre-alert',
    title: 'New Pre-Alert Received',
    description: 'John Doe submitted a pre-alert for tracking number JM456.',
    isRead: false,
    timestamp: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(),
    href: '/admin/pre-alerts'
  },
  {
    id: '3',
    type: 'status-update',
    title: 'Customs Cleared',
    description: 'Package JM101 for Alicia Keys has cleared customs in Jamaica.',
    isRead: true,
    timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    href: '/admin/shipping'
  },
];

export async function GET() {
  try {
    // In a real application, you would fetch this data from your database,
    // which would be populated by a webhook or service from iPack.
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch notifications', error }, { status: 500 });
  }
}
