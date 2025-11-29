
import type { Timestamp } from "firebase/firestore";

export type DropoffAddress = {
  id: string;
  name: string;
  address: string;
  parish: string;
};

export type PickupPerson = {
  id:string;
  name: string;
  idNumber: string;
};


export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  mailboxNumber: string;
  trn: string;
  address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
  };
  createdAt: Timestamp;
  dropoffAddresses?: DropoffAddress[];
  pickupPersonnel?: PickupPerson[];
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Transit' | 'Customs' | 'Delivered';
  date: Timestamp; 
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
  date: Timestamp;
  invoiceUrl: string;
};

export type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  customerId: string;
  subject: string;
  message: string;
  date: Timestamp;
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
    latestDate: Timestamp;
    isRead: boolean;
    date: Timestamp;
};

export type Invoice = {
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: Timestamp;
  amount: number;
  status: 'Paid' | 'Unpaid';
  invoiceUrl: string;
}

export type Rate = {
  weight: number;
  price: number;
}
