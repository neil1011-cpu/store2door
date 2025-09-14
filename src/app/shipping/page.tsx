
'use client';

import { useState } from 'react';
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
import { Mail, ArrowLeft, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';


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

type Shipment = typeof shipments[0];

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });

  const handleOpenEmailDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingId}`,
      body: `Dear ${shipment.customer.name},\n\nHere's an update on your shipment ${shipment.trackingId}:\n\nThe current status is: ${shipment.status}.\n\nEstimated delivery: ${shipment.estimatedDelivery}.\n\nThank you for shipping with us!\nFrom Store 2 Door`,
    });
    setIsDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!selectedShipment) return;
    toast({
      title: 'Email Sent',
      description: `An email update for shipment ${selectedShipment.trackingId} has been sent to ${selectedShipment.customer.name}.`,
    });
    setIsDialogOpen(false);
    setSelectedShipment(null);
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Shipping Status</h1>
                <p className="text-muted-foreground">Track all current shipments.</p>
            </div>
             <Button variant="outline" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailDialog(shipment)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Customize Email</DialogTitle>
            <DialogDescription>
              Edit the email content before sending it to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                value={emailContent.subject}
                onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="body" className="text-right">
                Body
              </Label>
              <Textarea
                id="body"
                value={emailContent.body}
                onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                className="col-span-3 min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail}>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
