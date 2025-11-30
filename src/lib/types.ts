
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
  createdAt: Timestamp | any;
  dropoffAddresses?: DropoffAddress[];
  pickupPersonnel?: PickupPerson[];
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Review' | 'Being Shipped' | 'In Transit' | 'On Route' | 'Customs' | 'Delivered';
  shippingDate: Timestamp | any; 
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
  submissionDate: Timestamp | any;
  invoiceUrl: string;
};

export type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  customerId: string;
  subject: string;
  message: string;
  date: Timestamp | any;
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
    latestDate: Timestamp | any;
    isRead: boolean;
    date: Timestamp | any;
};

export type LineItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: Timestamp | any;
  amount: number;
  status: 'Paid' | 'Unpaid';
  invoiceUrl: string;
  lineItems: LineItem[];
}

export type Rate = {
  weight: number;
  price: number;
}

export type Transaction = {
  id: string;
  type: 'revenue' | 'expense';
  description: string;
  amount: number;
  date: Timestamp | any;
}
