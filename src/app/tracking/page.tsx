
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, Search, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TrackingEvent = {
  status: string;
  location: string;
  date: string;
  description: string;
};

type ShipmentStatus = {
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  history: TrackingEvent[];
};

// Mock tracking data
const MOCK_TRACKING_DATA: { [key: string]: ShipmentStatus } = {
  'JM12345': {
    trackingNumber: 'JM12345',
    status: 'In Transit',
    origin: 'FL, USA',
    destination: 'Kingston, JA',
    estimatedDelivery: '3 days',
    history: [
      { status: 'In Transit to Jamaica', location: 'Miami, FL', date: '2024-09-29', description: 'Package is on its way to the destination country.' },
      { status: 'Processed at Warehouse', location: 'Miami, FL', date: '2024-09-28', description: 'Package processed at our Florida facility.' },
      { status: 'Pre-Alert Received', location: 'System', date: '2024-09-27', description: 'Shipment information received.' },
    ],
  },
  'JM67890': {
    trackingNumber: 'JM67890',
    status: 'Delivered',
    origin: 'FL, USA',
    destination: 'Montego Bay, JA',
    estimatedDelivery: 'Delivered',
    history: [
       { status: 'Delivered', location: 'Montego Bay, JA', date: '2024-09-28', description: 'Package has been delivered successfully.' },
       { status: 'Out for Delivery', location: 'Montego Bay, JA', date: '2024-09-28', description: 'Package is with the local courier for final delivery.' },
       { status: 'Cleared Customs', location: 'Montego Bay, JA', date: '2024-09-27', description: 'Customs duties paid and package released.' },
       { status: 'In Transit to Jamaica', location: 'Miami, FL', date: '2024-09-25', description: 'Package is on its way to the destination country.' },
    ]
  }
};

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [status, setStatus] = useState<ShipmentStatus | null | undefined>(undefined); // undefined: initial, null: not found
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) return;

    setLoading(true);
    setStatus(undefined);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = MOCK_TRACKING_DATA[trackingNumber.toUpperCase()];
    setStatus(result || null);
    setLoading(false);
  };
  
  const getStatusVariant = (status: string) => {
    if (status.includes('Delivered')) return 'outline';
    if (status.includes('Transit')) return 'default';
    return 'secondary';
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Track Your Package</CardTitle>
              <CardDescription>Enter your tracking number to see the latest status of your shipment.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="e.g., JM12345"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="text-base flex-grow"
                  aria-label="Tracking Number"
                />
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Track
                </Button>
              </form>
            </CardContent>
          </Card>

          {status && (
            <Card className="mt-8 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Tracking Details for #{status.trackingNumber}</CardTitle>
                        <CardDescription>Origin: {status.origin} → Destination: {status.destination}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(status.status)} className="text-lg px-4 py-2">{status.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-6 border-l-2 border-primary pl-8 ml-3">
                  {status.history.map((event, index) => (
                    <li key={index} className="relative">
                        <div className="absolute -left-[42px] top-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary-foreground" />
                        </div>
                      <p className="font-semibold text-foreground">{event.status}</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(event.date).toDateString()}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {status === null && (
            <Alert variant="destructive" className="mt-8">
              <Truck className="h-4 w-4" />
              <AlertTitle>Not Found</AlertTitle>
              <AlertDescription>
                We couldn't find a shipment with the tracking number "{trackingNumber}". Please check the number and try again.
              </AlertDescription>
            </Alert>
          )}

        </div>
      </div>
    </div>
  );
}
