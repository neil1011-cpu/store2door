
export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  mailboxNumber: string;
  address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
  };
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Transit' | 'Customs' | 'Delivered';
  date: any; // Can be a Timestamp
  cost?: number;
  paymentStatus?: 'Paid' | 'Unpaid';
  invoiceUrl: string;
  invoiceId?: string;
  customerId: string;
};
