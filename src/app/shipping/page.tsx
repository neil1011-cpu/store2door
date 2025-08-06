'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MoreHorizontal, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const shipments = [
  {
    trackingId: 'SR-123456789',
    status: 'In Transit',
    origin: 'New York, USA',
    destination: 'London, UK',
    estimatedDelivery: 'July 30, 2024',
    customer: {
      name: 'Jane Doe',
      email: 'jane.d@example.com',
    },
  },
  {
    trackingId: 'SR-987654321',
    status: 'Customs',
    origin: 'Los Angeles, USA',
    destination: 'Kingston, Jamaica',
    estimatedDelivery: 'August 2, 2024',
    customer: {
      name: 'John Smith',
      email: 'john.s@example.com',
    },
  },
  {
    trackingId: 'SR-555555555',
    status: 'Pre-Alert',
    origin: 'Miami, USA',
    destination: 'Montego Bay, Jamaica',
    estimatedDelivery: 'August 5, 2024',
    customer: {
      name: 'Carlos Garcia',
      email: 'carlos.g@example.com',
    },
  },
    {
    trackingId: 'SR-222333444',
    status: 'Delivered',
    origin: 'Orlando, USA',
    destination: 'Kingston, Jamaica',
    estimatedDelivery: 'July 28, 2024',
    customer: {
      name: 'Maria Rodriguez',
      email: 'maria.r@example.com',
    },
  },
];

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'In Transit':
            return 'default';
        case 'Customs':
            return 'secondary';
        case 'Delivered':
            return 'outline';
        case 'Pre-Alert':
            return 'destructive';
        default:
            return 'default';
    }
}

export default function ShippingPage() {
  const { toast } = useToast();

  const handleEmailCustomer = (customerName: string, trackingId: string) => {
    toast({
      title: 'Email Sent',
      description: `An email update for shipment ${trackingId} has been sent to ${customerName}.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
       <div>
            <h1 className="text-3xl font-bold tracking-tight">Shipping Status</h1>
            <p className="text-muted-foreground">Track all current shipments.</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>
            An overview of all packages currently in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Est. Delivery</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.trackingId}>
                  <TableCell className="font-mono">{shipment.trackingId}</TableCell>
                  <TableCell>
                    <div className="font-medium">{shipment.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{shipment.customer.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  </TableCell>
                  <TableCell>{shipment.origin}</TableCell>
                  <TableCell>{shipment.destination}</TableCell>
                  <TableCell>{shipment.estimatedDelivery}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleEmailCustomer(shipment.customer.name, shipment.trackingId)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Customer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
