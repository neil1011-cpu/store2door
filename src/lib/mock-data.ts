
import placeholderImages from './placeholder-images.json';

export type DropoffAddress = {
  id: string;
  name: string;
  address: string;
  parish: string;
};

export type PickupPerson = {
  id: string;
  name: string;
  idNumber: string;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  trn: string;
  mailboxNumber: string;
  address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
  };
  createdAt: string;
  dropoffAddresses?: DropoffAddress[];
  pickupPersonnel?: PickupPerson[];
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Transit' | 'Customs' | 'Delivered';
  date: string;
  cost?: number;
  paymentStatus?: 'Paid' | 'Unpaid';
  invoiceUrl: string;
  invoiceId?: string;
  customerId: string;
};


export type PreAlert = {
  id: string;
  customerName: string;
  customerId: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed';
  date: string;
  invoiceUrl: string;
};

export type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  customerId: string;
  subject: string;
  message: string;
  date: string;
  sender: 'user' | 'agent';
  status: 'Open' | 'Closed';
  attachment?: string;
};

export type Conversation = {
    id: string;
    customerName: string;
    customerId: string;
    subject: string;
    latestMessage: string;
    latestDate: string;
    isRead: boolean;
    date: string;
};

export type Invoice = {
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Unpaid';
  invoiceUrl: string;
}

export const users: UserProfile[] = [
  {
    id: 'user-1',
    fullName: 'Bob Marley',
    email: 'bob.marley@example.com',
    phone: '876-123-4567',
    trn: '123456789',
    mailboxNumber: 'FSTD101',
    address: {
      address1: '4350 NE 5th Terrace Bay #3',
      address2: 'FSTD101 -FSTD',
      city: 'Oakland Park',
      state: 'Florida',
      zip: '33334',
    },
    createdAt: '2024-01-01T12:00:00Z',
    dropoffAddresses: [
        { id: 'addr-1', name: 'Home', address: '56 Hope Road', parish: 'Kingston' }
    ],
    pickupPersonnel: [
        { id: 'person-1', name: 'Rita Marley', idNumber: 'DL12345' }
    ]
  },
  {
    id: 'user-2',
    fullName: 'Alicia Keys',
    email: 'alicia.keys@example.com',
    phone: '876-987-6543',
    trn: '987654321',
    mailboxNumber: 'FSTD102',
    address: {
      address1: '4350 NE 5th Terrace Bay #3',
      address2: 'FSTD102 -FSTD',
      city: 'Oakland Park',
      state: 'Florida',
      zip: '33334',
    },
    createdAt: '2024-01-02T12:00:00Z',
  }
];

export const shipments: Shipment[] = [
    {
        id: 'ship-1',
        trackingNumber: 'JM789',
        contents: 'Studio Headphones',
        status: 'Customs',
        date: '2024-07-26',
        cost: 67.50,
        paymentStatus: 'Paid',
        invoiceUrl: placeholderImages.invoices.inv1.src,
        invoiceId: 'INV-001',
        customerId: 'user-1'
    },
    {
        id: 'ship-2',
        trackingNumber: 'JM101',
        contents: 'Keyboard Piano',
        status: 'In Transit',
        date: '2024-07-28',
        cost: 120.00,
        paymentStatus: 'Unpaid',
        invoiceUrl: placeholderImages.invoices.inv2.src,
        invoiceId: 'INV-002',
        customerId: 'user-2'
    },
     {
        id: 'ship-3',
        trackingNumber: 'JM456',
        contents: 'Vinyl Records',
        status: 'Delivered',
        date: '2024-07-20',
        cost: 35.00,
        paymentStatus: 'Paid',
        invoiceUrl: placeholderImages.invoices.inv3.src,
        invoiceId: 'INV-003',
        customerId: 'user-1'
    }
];


export const preAlerts: PreAlert[] = [
    {
        id: 'pa-1',
        customerId: 'user-1',
        customerName: 'Bob Marley',
        trackingNumber: '1Z9999999999999999',
        contents: 'Guitar Strings',
        status: 'Processed',
        date: '2024-07-25',
        invoiceUrl: 'https://picsum.photos/seed/inv-pa1/800/1100'
    },
    {
        id: 'pa-2',
        customerId: 'user-2',
        customerName: 'Alicia Keys',
        trackingNumber: '949999999999999999',
        contents: 'Music Sheets',
        status: 'Pending',
        date: '2024-07-28',
        invoiceUrl: 'https://picsum.photos/seed/inv-pa2/800/1100'
    }
];

export const conversations: Conversation[] = [
    {
        id: 'conv-1',
        customerId: 'user-1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        latestMessage: 'Thanks for the update!',
        latestDate: '2024-07-27T10:00:00Z',
        isRead: true,
        date: '2024-07-26T10:00:00Z',
    },
    {
        id: 'conv-2',
        customerId: 'user-2',
        customerName: 'Alicia Keys',
        subject: 'Invoice INV-002',
        latestMessage: 'Can I pay this online?',
        latestDate: '2024-07-29T14:00:00Z',
        isRead: false,
        date: '2024-07-29T14:00:00Z',
    }
];

export const messages: Message[] = [
    {
        id: 'msg-1',
        conversationId: 'conv-1',
        customerId: 'user-1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Hi, I was just checking on the status of JM456.',
        date: '2024-07-26T10:00:00Z',
        sender: 'user',
        status: 'Open'
    },
    {
        id: 'msg-2',
        conversationId: 'conv-1',
        customerId: 'user-1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Hi Bob, thanks for reaching out. It looks like shipment JM456 was delivered on July 20th. Let us know if you have any other questions!',
        date: '2024-07-26T10:05:00Z',
        sender: 'agent',
        status: 'Open'
    },
    {
        id: 'msg-3',
        conversationId: 'conv-1',
        customerId: 'user-1',
        customerName: 'Bob Marley',
        subject: 'Question about my last shipment',
        message: 'Thanks for the update!',
        date: '2024-07-27T10:00:00Z',
        sender: 'user',
        status: 'Open'
    },
    {
        id: 'msg-4',
        conversationId: 'conv-2',
        customerId: 'user-2',
        customerName: 'Alicia Keys',
        subject: 'Invoice INV-002',
        message: 'Can I pay this online?',
        date: '2024-07-29T14:00:00Z',
        sender: 'user',
        status: 'Open'
    }
];


export const invoices: Invoice[] = [
  {
    invoiceId: 'INV-001',
    customerId: 'user-1',
    customerName: 'Bob Marley',
    date: '2024-07-28',
    amount: 67.50,
    status: 'Paid',
    invoiceUrl: placeholderImages.invoices.inv1.src,
  },
  {
    invoiceId: 'INV-002',
    customerId: 'user-2',
    customerName: 'Alicia Keys',
    date: '2024-07-29',
    amount: 120.00,
    status: 'Unpaid',
    invoiceUrl: placeholderImages.invoices.inv2.src,
  },
];
