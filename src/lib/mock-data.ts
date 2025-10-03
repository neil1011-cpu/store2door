import placeholderImages from '@/lib/placeholder-images.json';

export type User = {
  id: string;
  fullName: string;
  email: string;
  password?: string;
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
};

export const users: User[] = [
    {
        id: '1',
        fullName: 'Alicia Keys',
        email: 'alicia@example.com',
        password: 'password123',
        phone: '876-555-0101',
        trn: '111222333',
        mailboxNumber: 'FSTD101',
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: 'FSTD101 -FSTD',
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
    },
    {
        id: '2',
        fullName: 'Bob Marley',
        email: 'bob@example.com',
        password: 'password123',
        phone: '876-555-0102',
        trn: '444555666',
        mailboxNumber: 'FSTD102',
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: 'FSTD102 -FSTD',
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
    }
];


export type Invoice = {
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Unpaid';
  invoiceUrl: string;
};

export const invoices: Invoice[] = [
  {
    invoiceId: 'INV-001',
    customerId: '2',
    customerName: 'Bob Marley',
    date: '2024-07-28',
    amount: 67.50,
    status: 'Paid',
    invoiceUrl: placeholderImages.invoices.inv1.src,
  },
  {
    invoiceId: 'INV-002',
    customerId: '1',
    customerName: 'Alicia Keys',
    date: '2024-07-29',
    amount: 120.00,
    status: 'Unpaid',
    invoiceUrl: placeholderImages.invoices.inv2.src,
  },
];


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

export const shipments: Shipment[] = [
    { id: '1', customerId: '1', trackingNumber: 'JM456', contents: 'Laptop from Amazon', status: 'In Transit', date: new Date().toLocaleDateString('en-US'), cost: 45.50, paymentStatus: 'Unpaid', invoiceUrl: placeholderImages.invoices.inv1.src },
    { id: '2', customerId: '2', trackingNumber: 'JM789', contents: 'Books from eBay', status: 'Customs', date: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US'), cost: 22.00, paymentStatus: 'Unpaid', invoiceUrl: placeholderImages.invoices.inv2.src},
    { id: '3', customerId: '1', trackingNumber: 'JM101', contents: 'Shoes from Zappos', status: 'Delivered', date: new Date(new Date().setDate(new Date().getDate() - 5)).toLocaleDateString('en-US'), cost: 30.00, paymentStatus: 'Paid', invoiceUrl: placeholderImages.invoices.inv3.src },
];
