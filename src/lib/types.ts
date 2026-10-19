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
  | 'Received'
  | 'Processing' 
  | 'In transit' 
  | 'Out for delivery' 
  | 'Ready for pick up'
  | 'Delivered'
  | 'Returned'
  | 'On Hold';

export type ShipmentTimelineEvent = {
    type: string;
    date: any;
};

export type Shipment = {
  id: string;
  profile_id: string;
  tracking_number: string;
  contents: string; 
  status: ShipmentStatus | string;
  shipping_date: any; 
  weight_lbs: number;
  total_cost_jmd?: number;
  payment_status?: 'Paid' | 'Unpaid' | 'Partial';
  invoice_url?: string;
  logicware_id?: string;
  manifest_id?: string;
  created_at: any;
  updated_at: any;
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
  profile_id: string;
  tracking_number: string;
  contents: string;
  weight_lbs?: number;
  status: 'Pending' | 'Processed' | 'Cancelled';
  submission_date: any;
  invoice_url?: string;
  logicware_id?: string;
  legacy_firebase_id?: string;
};

export type LineItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  profile_id: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Void';
  created_at: any;
  invoice_url?: string;
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
