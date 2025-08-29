
import { NextResponse } from 'next/server';
import { z } from 'zod';

type PreAlert = {
  id: string;
  customer: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed';
  date: string;
  invoiceUrl: string;
};

// Using an in-memory store for now. In a real app, you'd use a database.
let preAlerts: PreAlert[] = [
    {
        id: '1',
        customer: 'John Doe',
        trackingNumber: 'JM456',
        contents: 'Laptop from Amazon',
        status: 'Pending',
        date: new Date().toLocaleDateString('en-US'),
        invoiceUrl: 'https://picsum.photos/600/800',
    },
    {
        id: '2',
        customer: 'Jane Smith',
        trackingNumber: 'JM789',
        contents: 'Books from eBay',
        status: 'Processed',
        date: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US'),
        invoiceUrl: 'https://picsum.photos/600/800',
    }
];

const intakeSchema = z.object({
  trackingId: z.string(),
  customerName: z.string(),
  contents: z.string(), // Represents the company/item purchased
  status: z.enum(['Pending', 'Processed']),
});

// GET handler to fetch all pre-alerts
export async function GET() {
  try {
    // In a real app, you'd fetch from your database here.
    return NextResponse.json(preAlerts);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch pre-alerts', error }, { status: 500 });
  }
}

// POST handler to add a new pre-alert
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = intakeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }

    const { trackingId, customerName, contents, status } = validation.data;
    
    const newAlert: PreAlert = {
      id: (preAlerts.length + 1).toString(),
      customer: customerName,
      trackingNumber: trackingId,
      contents: contents,
      status: status,
      date: new Date().toLocaleDateString('en-US'),
      invoiceUrl: 'https://picsum.photos/600/800', // Generate a random placeholder
    };

    // In a real app, you'd save to your database here.
    preAlerts.unshift(newAlert); // Add to the top of the list

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create pre-alert', error }, { status: 500 });
  }
}
