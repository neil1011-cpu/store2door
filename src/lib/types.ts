
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
  id: string; // This is the Firebase Auth UID
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

export type ShipmentStatus = 
  | 'Pending' 
  | 'Pre-Alert' 
  | 'Received at Warehouse (FL)'
  | 'Processed' 
  | 'In Review' 
  | 'Being Shipped' 
  | 'In Transit' 
  | 'Arrived in Jamaica'
  | 'Customs' 
  | 'On Route' 
  | 'Delivered';

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: ShipmentStatus;
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
  invoiceHtml: string; // The generated HTML invoice for viewing
  uploadedInvoiceUrl: string; // The original data URI of the user's uploaded image
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
