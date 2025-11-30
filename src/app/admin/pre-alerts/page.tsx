
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
import type { Shipment, PreAlert, UserProfile, Invoice, LineItem } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, where, orderBy, serverTimestamp, doc, addDoc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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

const generateInvoiceHtml = (invoiceData: {
  invoiceId: string;
  customerName: string;
  invoiceDate: Date;
  lineItems: LineItem[];
  totalAmount: number;
}): string => {
  const { invoiceId, customerName, invoiceDate, lineItems, totalAmount } = invoiceData;

  const lineItemsHtml = lineItems
    .map(
      (item) => `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">$${item.price.toFixed(2)}</td>
      <td class="text-right">$${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
        .container { max-width: 800px; margin: 40px auto; padding: 30px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; color: #0d6efd; }
        .header .company-details { text-align: right; }
        .header .company-details p { margin: 0; font-size: 0.9em; color: #6c757d; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .invoice-details .bill-to p { margin: 0; }
        .invoice-details .invoice-meta { text-align: right; }
        .invoice-details .invoice-meta p { margin: 0; }
        .invoice-details .invoice-meta .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 15px; border-bottom: 1px solid #dee2e6; }
        thead th { background-color: #e9ecef; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-section { margin-top: 30px; text-align: right; }
        .total-section table { width: auto; margin-left: auto; }
        .total-section th, .total-section td { border: none; padding: 8px 15px; }
        .total-section .grand-total { font-size: 1.4em; font-weight: bold; color: #0d6efd; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; font-size: 0.9em; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>INVOICE</h1>
          <div class="company-details">
            <p style="font-weight: bold; font-size: 1.2em;">FromStore2Door</p>
            <p>4350 NE 5th Terrace Bay #3</p>
            <p>Oakland Park, Florida, 33334</p>
            <p>fromstore2door@gmail.com</p>
          </div>
        </div>
        <div class="invoice-details">
          <div class="bill-to">
            <p style="color: #6c757d; margin-bottom: 5px;">BILL TO</p>
            <p style="font-weight: bold; font-size: 1.2em;">${customerName}</p>
          </div>
          <div class="invoice-meta">
            <p><span class="label">Invoice #:</span> ${invoiceId}</p>
            <p><span class="label">Date:</span> ${invoiceDate.toLocaleDateString()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        <div class="total-section">
          <table>
            <tr>
              <td class="label">Total:</td>
              <td class="grand-total">$${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};


function CreateShipmentDialog({ preAlert, onShipmentCreated }: { preAlert: PreAlert, onShipmentCreated: (preAlertId: string, cost: number) => void }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cost, setCost] = useState('');
    const { toast } = useToast();

    const handleSubmitShipment = async () => {
        if (!cost || parseFloat(cost) <= 0) {
            toast({ title: "Invalid Cost", description: "Please enter a valid shipping cost.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        await onShipmentCreated(preAlert.id, parseFloat(cost));

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
                        Confirm the details and add the shipping cost to create a new shipment record. This will mark the pre-alert as 'Processed' and generate an invoice.
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
                        Create Shipment & Invoice
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
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const preAlertsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collectionGroup(firestore, 'pre_alerts'));
  }, [firestore, user]);
  const { data: preAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  const loading = isLoadingUsers || isLoadingPreAlerts || isUserLoading;

  const handleCreateAlert = async () => {
    const selectedUser = users?.find(u => u.id === newAlert.customerId);
    if (!selectedUser || !newAlert.trackingNumber || !newAlert.contents) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const preAlertsCollection = collection(firestore, 'users', selectedUser.id, 'pre_alerts');
    const newDocRef = doc(preAlertsCollection); 
    
    const alertToAdd = {
      customerName: selectedUser.fullName,
      customerId: selectedUser.id,
      trackingNumber: newAlert.trackingNumber,
      contents: newAlert.contents,
      status: 'Pending' as const,
      submissionDate: serverTimestamp(),
      invoiceUrl: '', 
    };
    
    try {
        await setDoc(newDocRef, alertToAdd);
        toast({
          title: 'Pre-Alert Created',
          description: `Pre-alert for ${newAlert.trackingNumber} has been created.`,
        });
        setOpen(false);
        setNewAlert({ customerId: '', trackingNumber: '', contents: '' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: preAlertsCollection.path,
            operation: 'create',
            requestResourceData: alertToAdd
        }));
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleShipmentCreated = async (preAlertId: string, cost: number) => {
     if (!firestore || !preAlerts) return;
    
    const preAlert = preAlerts.find(pa => pa.id === preAlertId);
    if(!preAlert) {
      toast({ title: "Pre-Alert not found", variant: "destructive" });
      return;
    }

    const batch = writeBatch(firestore);
    const invoiceDate = new Date();
    const invoiceId = `INV-${Date.now()}`;
    const lineItems: LineItem[] = [{ description: preAlert.contents, quantity: 1, price: cost }];

    // 1. Generate Invoice HTML
    const invoiceHtml = generateInvoiceHtml({
      invoiceId,
      customerName: preAlert.customerName,
      invoiceDate,
      lineItems,
      totalAmount: cost,
    });

    // 2. Create Invoice Document
    const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
    const newInvoice: Omit<Invoice, 'id'> = {
        invoiceId,
        customerId: preAlert.customerId,
        customerName: preAlert.customerName,
        date: invoiceDate,
        amount: cost,
        status: 'Unpaid',
        lineItems,
        invoiceUrl: invoiceHtml,
    };
    batch.set(invoiceDocRef, newInvoice);
    
    // 3. Create Shipment Document
    const shipmentDocRef = doc(collection(firestore, 'users', preAlert.customerId, 'shipments'));
    const newShipment: Omit<Shipment, 'id'> = {
        customerId: preAlert.customerId,
        trackingNumber: preAlert.trackingNumber,
        contents: preAlert.contents,
        status: 'Processed',
        shippingDate: serverTimestamp(),
        cost: cost,
        paymentStatus: 'Unpaid',
        invoiceId: invoiceId,
        invoiceUrl: invoiceHtml,
    };
    batch.set(shipmentDocRef, newShipment);

    // 4. Update Pre-Alert status
    const preAlertDocRef = doc(firestore, 'users', preAlert.customerId, 'pre_alerts', preAlertId);
    batch.update(preAlertDocRef, { status: 'Processed' });
    
    try {
        await batch.commit();
        toast({
          title: "Shipment & Invoice Created",
          description: `Shipment for ${preAlert.trackingNumber} has been created.`
        });
    } catch (error) {
        console.error("Error creating shipment and invoice:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${preAlert.customerId}`,
            operation: 'write',
        }));
    }
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
                            {users && users.map(user => (
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
              {!preAlerts || preAlerts.length === 0 ? (
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
                    <TableCell>{alert.submissionDate ? new Date((alert.submissionDate as any).toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(alert.status)}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!alert.invoiceUrl}>View Invoice</Button>
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
                          <div className="p-4 relative min-h-[600px]">
                            {alert.invoiceUrl ? (
                                <Image
                                src={alert.invoiceUrl}
                                alt={`Invoice for ${alert.trackingNumber}`}
                                fill
                                style={{ objectFit: 'contain' }}
                                />
                            ) : (
                               <div className="flex items-center justify-center h-full text-muted-foreground">No invoice was uploaded.</div>
                            )}
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
