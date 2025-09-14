
import { NextResponse } from 'next/server';
import { z } from 'zod';

type Message = {
  id: string;
  customerName: string;
  subject: string;
  message: string;
  date: string;
  status: 'New' | 'Read';
};

// Using an in-memory store for now. In a real app, you'd use a database.
let messages: Message[] = [
    {
        id: '1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Hi there, I was just wondering about the status of my last package, tracking number JM789. It seems to be stuck in customs. Can you provide an update? Thanks!',
        date: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US'),
        status: 'New',
    },
    {
        id: '2',
        customerName: 'Alicia Keys',
        subject: 'Address Update',
        message: 'Hello, I need to update my delivery address for future shipments. Please let me know what information you need from me. Best, Alicia',
        date: new Date(new Date().setDate(new Date().getDate() - 2)).toLocaleDateString('en-US'),
        status: 'Read',
    }
];

const messageSchema = z.object({
  customerName: z.string(),
  subject: z.string(),
  message: z.string(),
});

// GET handler to fetch all messages
export async function GET() {
  try {
    // In a real app, you'd fetch from your database here.
    return NextResponse.json(messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch messages', error }, { status: 500 });
  }
}

// POST handler to add a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = messageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }

    const { customerName, subject, message } = validation.data;
    
    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      customerName,
      subject,
      message,
      status: 'New',
      date: new Date().toLocaleDateString('en-US'),
    };

    messages.unshift(newMessage);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create message', error }, { status: 500 });
  }
}

    