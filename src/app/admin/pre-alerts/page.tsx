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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { PlusCircle, ArrowLeft, Loader2, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import type { Shipment, PreAlert, UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, where, orderBy, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const MOCK_USERS: UserProfile[] = [
    { id: 'user1', fullName: 'John Doe', email: 'john.doe@example.com', phone: '', trn: '', mailboxNumber: '', address: {} as any, createdAt: new Date() },
    { id: 'user2', fullName: 'Jane Smith', email: 'jane.smith@example.com', phone: '', trn: '', mailboxNumber: '', address: {} as any, createdAt: new Date() }
]

const MOCK_ALERTS: PreAlert[] = [
    { id: 'alert1', customerId: 'user1', customerName: 'John Doe', trackingNumber: 'TN12345', contents: 'Shoes', status: 'Pending', submissionDate: new Date(), invoiceUrl: 'https://picsum.photos/seed/inv1/600/800' },
    { id: 'alert2', customerId: 'user2', customerName: 'Jane Smith', trackingNumber: 'TN67890', contents: 'Laptop', status: 'Processed', submissionDate: new Date(), invoiceUrl: 'https://picsum.photos/seed/inv2/600/800' }
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'destructive';
    case 'Processed':
      return 'secondary';
    default:
      return 'default';
  }
};


function CreateShipmentDialog({ preAlert, onShipmentCreated }: { preAlert: PreAlert, onShipmentCreated: (newShipment: Omit<Shipment, 'id'>, preAlertId: string) => void }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cost, setCost] = useState('');
    const { toast } = useToast();

    const handleSubmitShipment = () => {
        if (!cost || parseFloat(cost) <= 0) {
            toast({ title: "Invalid Cost", description: "Please enter a valid shipping cost.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        const newShipment: Omit<Shipment, 'id'> = {
            customerId: preAlert.customerId,
            trackingNumber: preAlert.trackingNumber,
            contents: preAlert.contents,
            status: 'Processed',
            shippingDate: serverTimestamp(),
            cost: parseFloat(cost),
            paymentStatus: 'Unpaid',
            invoiceUrl: preAlert.invoiceUrl,
            invoiceId: `INV-${Date.now()}`
        };
        
        onShipmentCreated(newShipment, preAlert.id);

        setIsSubmitting(false);
        setOpen(false);
    };


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" disabled={preAlert.status === 'Processed'}>
                    <Truck className="mr-2 h-4 w-4" />
                    {preAlert.status === 'Processed' ? 'Processed' : 'Create Shipment'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Shipment for {preAlert.trackingNumber}</DialogTitle>
                    <DialogDescription>
                        Confirm the details and add the shipping cost to create a new shipment record. This will mark the pre-alert as 'Processed'.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <Input value={preAlert.customerName} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label>Contents</Label>
                        <Input value={preAlert.contents} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="shipping-cost">Shipping Cost (USD)</Label>
                        <Input 
                            id="shipping-cost"
                            type="number"
                            placeholder="e.g., 55.00"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmitShipment} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Shipment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



export default function PreAlertsPage() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [newAlert, setNewAlert] = useState({
    customerId: '',
    trackingNumber: '',
    contents: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preAlerts, setPreAlerts] = useState<PreAlert[]>(MOCK_ALERTS);
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);
  const loading = false;


  const handleCreateAlert = async () => {
    const selectedUser = users.find(u => u.id === newAlert.customerId);
    if (!selectedUser || !newAlert.trackingNumber || !newAlert.contents) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const alertToAdd: PreAlert = {
      id: `alert-${Date.now()}`,
      customerName: selectedUser.fullName,
      customerId: selectedUser.id,
      trackingNumber: newAlert.trackingNumber,
      contents: newAlert.contents,
      status: 'Pending',
      submissionDate: new Date(),
      invoiceUrl: `https://picsum.photos/seed/${Math.random()}/600/800`, // Placeholder
    }
    
    setTimeout(() => {
        setPreAlerts(prev => [alertToAdd, ...prev]);
        toast({
          title: 'Pre-Alert Created (Mock)',
          description: `Pre-alert for ${newAlert.trackingNumber} has been created.`,
        });
        setOpen(false);
        setNewAlert({ customerId: '', trackingNumber: '', contents: '' });
        setIsSubmitting(false);
    }, 1000);
  };
  
  const handleShipmentCreated = (newShipment: Omit<Shipment, 'id'>, preAlertId: string) => {
    toast({ title: "Shipment Created (Mock)", description: `Shipment for ${newShipment.trackingNumber} has been created.`});
    setPreAlerts(prev => prev.map(alert => alert.id === preAlertId ? {...alert, status: 'Processed'} : alert));
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pre-Alerts</h1>
          <p className="text-muted-foreground">
            View and manage incoming pre-alerts from customers.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Pre-Alert
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create New Pre-Alert</DialogTitle>
                <DialogDescription>
                    Enter the details for the new pre-alert.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer" className="text-right">
                    Customer
                    </Label>
                    <Select onValueChange={(value) => setNewAlert({...newAlert, customerId: value})} >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={"Select a customer"} />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="trackingNumber" className="text-right">
                    Tracking #
                    </Label>
                    <Input id="trackingNumber" value={newAlert.trackingNumber} onChange={(e) => setNewAlert({...newAlert, trackingNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contents" className="text-right">
                    Contents
                    </Label>
                    <Input id="contents" value={newAlert.contents} onChange={(e) => setNewAlert({...newAlert, contents: e.target.value})} className="col-span-3" />
                </div>
                </div>
                <DialogFooter>
                <Button type="submit" onClick={handleCreateAlert} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Pre-Alert"}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Incoming Pre-Alerts</CardTitle>
          <CardDescription>
            A list of all pre-alerts submitted by customers. Process pending alerts to create shipments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preAlerts.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">No pre-alerts found.</TableCell>
                </TableRow>
              ) : (
                preAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">
                      {alert.customerName}
                    </TableCell>
                    <TableCell>{alert.trackingNumber}</TableCell>
                    <TableCell>{alert.contents}</TableCell>
                    <TableCell>{new Date(alert.submissionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(alert.status)}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">View Invoice</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>
                              Invoice for {alert.trackingNumber}
                            </DialogTitle>
                            <DialogDescription>
                              Invoice submitted by {alert.customerName}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="p-4">
                            <Image
                              src={alert.invoiceUrl}
                              alt={`Invoice for ${alert.trackingNumber}`}
                              width={600}
                              height={800}
                              className="w-full h-auto"
                              data-ai-hint="invoice document"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                     <TableCell>
                       <CreateShipmentDialog preAlert={alert} onShipmentCreated={handleShipmentCreated} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    