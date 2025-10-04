
import { NextResponse } from 'next/server';
import { z } from 'zod';

type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  subject: string;
  message: string;
  date: string;
  sender: 'user' | 'agent';
  status: 'Open' | 'Closed';
  attachment?: string;
};

// Using an in-memory store for now. In a real app, you'd use a database.
let messages: Message[] = [
    {
        id: '1',
        conversationId: 'conv1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Hi there, I was just wondering about the status of my last package, tracking number JM789. It seems to be stuck in customs. Can you provide an update? Thanks!',
        date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        sender: 'user',
        status: 'Open',
    },
    {
        id: '1a',
        conversationId: 'conv1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Hello! Thanks for reaching out. We see that your package is currently undergoing standard customs inspection. This usually takes 2-3 business days. We will notify you as soon as it clears.',
        date: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
        sender: 'agent',
        status: 'Open',
    },
    {
        id: '2',
        conversationId: 'conv2',
        customerName: 'Alicia Keys',
        subject: 'Address Update',
        message: 'Hello, I need to update my delivery address for future shipments. Please let me know what information you need from me. Best, Alicia',
        date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        sender: 'user',
        status: 'Open', // Changed to Open to be visible in inbox
    }
];

const messageSchema = z.object({
  customerName: z.string(),
  subject: z.string(),
  message: z.string(),
  conversationId: z.string().optional(),
  sender: z.enum(['user', 'agent']),
  attachment: z.string().optional(),
});

// GET handler to fetch all messages
export async function GET() {
  try {
    // In a real app, you'd fetch from your database here.
    return NextResponse.json(messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
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

    const { customerName, subject, message, sender, conversationId, attachment } = validation.data;
    
    const newConversationId = conversationId || `conv${Date.now()}`;

    // If an agent sends a message, mark all user messages in that convo as "read" by changing status.
    // This is a simplification for the demo.
    if (sender === 'agent' && conversationId) {
        messages.forEach(msg => {
            if (msg.conversationId === conversationId && msg.sender === 'user') {
                msg.status = 'Closed'; // "Closed" here means "read/handled" by agent
            }
        });
    }
    
    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      conversationId: newConversationId,
      customerName,
      subject,
      message,
      sender,
      date: new Date().toISOString(),
      // New messages from users are 'Open', agent replies can leave it 'Open' or 'Closed'
      // For simplicity, agent replies make it 'read' (Closed) from user PoV
      status: sender === 'user' ? 'Open' : 'Closed',
      attachment,
    };

    messages.push(newMessage); // Using push instead of unshift to keep chronological order for API response

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create message', error }, { status: 500 });
  }
}
