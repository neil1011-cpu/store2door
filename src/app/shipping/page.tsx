'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PackageCheck, Warehouse, Plane, Truck, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const shipmentData = {
  trackingId: 'SR-123456789',
  status: 'In Transit',
  origin: 'New York, USA',
  destination: 'London, UK',
  estimatedDelivery: 'July 30, 2024',
  customer: {
    name: 'Jane Doe',
    email: 'jane.d@example.com',
  },
  history: [
    {
      status: 'Delivered',
      location: 'London, UK',
      date: 'July 28, 2024',
      time: '11:45 AM',
      icon: <Home />,
      current: false,
    },
    {
      status: 'Out for Delivery',
      location: 'London, UK',
      date: 'July 28, 2024',
      time: '8:30 AM',
      icon: <Truck />,
      current: false,
    },
    {
      status: 'Arrived at Local Facility',
      location: 'London, UK',
      date: 'July 28, 2024',
      time: '5:00 AM',
      icon: <Warehouse />,
      current: false,
    },
    {
      status: 'In Transit to Destination',
      location: 'Flight BA0177',
      date: 'July 27, 2024',
      time: '10:00 PM',
      icon: <Plane />,
      current: true,
    },
    {
      status: 'Departed from Origin Facility',
      location: 'New York, USA',
      date: 'July 26, 2024',
      time: '8:15 PM',
      icon: <Warehouse />,
      current: false,
    },
    {
      status: 'Package Received',
      location: 'New York, USA',
      date: 'July 26, 2024',
      time: '2:30 PM',
      icon: <PackageCheck />,
      current: false,
    },
  ],
};

const StatusStep = ({
  icon,
  status,
  isCurrent,
  isCompleted,
  isFirst,
  isLast,
}: {
  icon: React.ReactNode;
  status: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isFirst: boolean;
  isLast: boolean;
}) => {
  return (
    <div className="relative flex flex-col items-center">
      {!isFirst && (
        <div
          className={`absolute top-0 left-1/2 h-full w-0.5 -translate-y-full -translate-x-1/2 ${
            isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
          }`}
        />
      )}
      <div
        className={`z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          isCurrent
            ? 'bg-primary ring-4 ring-primary/20'
            : isCompleted
            ? 'bg-primary'
            : 'bg-muted border'
        }`}
      >
        <div className="text-primary-foreground">{icon}</div>
      </div>
      <p
        className={`mt-2 text-center text-xs ${
          isCurrent ? 'font-bold text-primary' : isCompleted ? '' : 'text-muted-foreground'
        }`}
      >
        {status}
      </p>
    </div>
  );
};

export default function ShippingPage() {
  const currentStatusIndex = shipmentData.history.findIndex((item) => item.current);
  const { toast } = useToast();

  const handleNotify = () => {
    toast({
        title: 'Email Sent',
        description: `An update has been sent to ${shipmentData.customer.email}.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Shipping Status</h1>
            <p className="text-muted-foreground">Track your shipment and notify customers.</p>
        </div>
        <Button onClick={handleNotify}>
            <Mail className="mr-2 h-4 w-4" />
            Notify Customer
        </Button>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Tracking ID: {shipmentData.trackingId}</CardTitle>
          <CardDescription>
            From {shipmentData.origin} to {shipmentData.destination}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="grid grid-cols-6 gap-4 text-center text-sm">
              <StatusStep icon={<PackageCheck />} status="Processing" isCompleted={currentStatusIndex < 5} isCurrent={currentStatusIndex === 5} isFirst isLast={false} />
              <StatusStep icon={<Warehouse />} status="At Origin" isCompleted={currentStatusIndex < 4} isCurrent={currentStatusIndex === 4} isFirst={false} isLast={false} />
              <StatusStep icon={<Plane />} status="In Flight" isCompleted={currentStatusIndex < 3} isCurrent={currentStatusIndex === 3} isFirst={false} isLast={false} />
              <StatusStep icon={<Warehouse />} status="At Destination" isCompleted={currentStatusIndex < 2} isCurrent={currentStatusIndex === 2} isFirst={false} isLast={false} />
              <StatusStep icon={<Truck />} status="Out for Delivery" isCompleted={currentStatusIndex < 1} isCurrent={currentStatusIndex === 1} isFirst={false} isLast={false} />
              <StatusStep icon={<Home />} status="Delivered" isCompleted={currentStatusIndex < 0} isCurrent={currentStatusIndex === 0} isFirst={false} isLast />
            </div>
          </div>
          <Separator />
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Shipment History</h3>
            <div className="relative pl-8">
                <div className="absolute left-3 top-0 h-full w-0.5 bg-border" />
                {shipmentData.history.map((item, index) => (
                    <div key={index} className="mb-8 flex items-start">
                        <div className={`absolute left-0 z-10 flex h-6 w-6 items-center justify-center rounded-full ${item.current ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted border'}`}>
                            <div className={`h-2.5 w-2.5 rounded-full ${item.current ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
                        </div>
                        <div className="ml-4">
                            <p className={`font-semibold ${item.current ? 'text-primary' : ''}`}>{item.status}</p>
                            <p className="text-sm text-muted-foreground">{item.location}</p>
                            <p className="text-xs text-muted-foreground">{item.date} at {item.time}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
