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
  full_name: string;
  email: string;
  phone?: string;
  mailbox_number: string;
  trn?: string;
  wallet_balance?: number;
  created_at: any;
  updated_at?: any;
  address?: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
  };
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
  | 'Available for pickup'
  | 'Delivered';

export type ShipmentTimelineEvent = {
    type: string;
    date: any;
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  internalBarcode?: string;
  contents: string; 
  status: ShipmentStatus | string;
  shippingDate: any; 
  weight: number;
  total_cost_jmd?: number;
  paymentStatus?: 'Paid' | 'Unpaid';
  customerId: string;
  createdAt: any;
  updatedAt: any;
};

export type ManifestStatus = 'Open' | 'Closed' | 'Scheduled' | 'Departed' | 'Arrived';

export type Manifest = {
  id: string;
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
  status: ManifestStatus | string;
  type?: 'Air' | 'Sea';
  carrier?: string;
  isLogicware?: boolean;
};

export type PreAlert = {
  id: string;
  customerName: string;
  customerId: string;
  trackingNumber: string;
  contents: string;
  weight?: number;
  status: 'Pending' | 'Processed';
  submissionDate: any;
  uploadedInvoiceUrl: string;
  isLogicware?: boolean;
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
  date: any;
  amount: number;
  status: 'Paid' | 'Unpaid';
  invoiceUrl: string;
  lineItems?: LineItem[];
}

export type Transaction = {
  id: string;
  type: 'revenue' | 'expense';
  description: string;
  amount: number;
  date: any;
  customerId?: string;
}

export type SystemLog = {
    id: string;
    type: string;
    description: string;
    userId?: string;
    userName?: string;
    timestamp: any;
    metadata?: any;
};
