
'use client';

import { useState, useMemo } from 'react';
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
import { Mail, ArrowLeft, Truck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Shipment } from '@/app/account/page';


const getStatusVariant = (status: string) => {
    switch (status) {
        case 'In Transit':
            return 'default';
        case 'Customs':
            return 'secondary';
        case 'Delivered':
            return 'outline';
        case 'Pending':
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
  
  const firestore = useFirestore();
  const shipmentsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'shipments'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: shipments, isLoading } = useCollection<Shipment>(shipmentsQuery);

  const handleOpenEmailDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    // In a real app you'd get the customer details from the user collection
    const customerName = 'Valued Customer';
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingNumber}`,
      body: `Dear ${customerName},\n\nHere's an update on your shipment ${shipment.trackingNumber}:\n\nThe current status is: ${shipment.status}.\n\nThank you for shipping with us!\nFromStore2Door`,
    });
    setIsDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!selectedShipment) return;
    toast({
      title: 'Email Sent',
      description: `An email update for shipment ${selectedShipment.trackingNumber} has been sent.`,
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
                <Link href="/admin">
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
                <TableHead>Contents</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && shipments && shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{shipment.customerId}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  </TableCell>
                  <TableCell>{shipment.contents}</TableCell>
                   <TableCell>{new Date(shipment.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailDialog(shipment)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Customer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && (!shipments || shipments.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No shipments found.</TableCell>
                </TableRow>
              )}
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
