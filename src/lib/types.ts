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
  firstName?: string;
  lastName?: string;
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
  needsPasswordReset?: boolean;
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

export type ShipmentTimelineEvent = {
    type: string;
    date: any;
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  internalBarcode?: string;
  contents: string; // Map to description
  description?: string;
  status: ShipmentStatus | string;
  shippingDate: Timestamp | any; 
  
  merchant?: string;
  sourceMarketplace?: string;
  location?: string;

  weight: number;
  length?: number;
  width?: number;
  height?: number;

  dimensionalWeight?: number;
  billableWeight?: number;

  declaredValueUsd?: number;
  shippingCostUsd?: number;
  cost?: number; // Total JMD

  customsExempt?: boolean;
  clearanceRate?: number;
  estimatedClearanceJmd?: number;
  exchangeRate?: number;

  invoiceUploaded?: boolean;
  invoiceUrl: string;
  invoiceId?: string;

  fragile?: boolean;

  shipperId: string | null;
  shipperName?: string | null;

  manifestId?: string | null;
  pickupBranch?: string | null;

  timeline?: ShipmentTimelineEvent[];
  notes?: string[];

  createdAt: any;
  updatedAt: any;
  
  customerId: string;
  paymentStatus?: 'Paid' | 'Unpaid';
  source?: 'firebase' | 'logicware';
  isLogicware?: boolean;
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
  status: 'Pending' | 'Processed';
  submissionDate: Timestamp | any;
  invoiceHtml: string; // The generated HTML invoice for viewing
  uploadedInvoiceUrl: string; // The original data URI of the user's uploaded image
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

export type Transaction = {
  id: string;
  type: 'revenue' | 'expense';
  description: string;
  amount: number;
  date: Timestamp | any;
}
