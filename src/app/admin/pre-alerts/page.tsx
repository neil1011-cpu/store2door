'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft, Loader2, Download, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import type { Shipment, PreAlert, UserProfile, LineItem } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, serverTimestamp, doc, addDoc, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Pending': return 'destructive';
    case 'Processed': return 'secondary';
    default: return 'default';
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
  const lineItemsHtml = lineItems.map((item) => `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">JMD $${item.price.toFixed(2)}</td>
      <td class="text-right">JMD $${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><title>Invoice ${invoiceId}</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
        .text-right { text-align: right; }
        .grand-total { font-size: 1.5em; font-weight: bold; color: #0d6efd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>INVOICE</h1><div><strong>SwiftRoute</strong><br>Florida, USA</div></div>
        <div style="margin-top: 20px;"><strong>BILL TO:</strong> ${customerName}<br>Invoice #: ${invoiceId}<br>Date: ${invoiceDate.toLocaleDateString()}</div>
        <table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${lineItemsHtml}</tbody></table>
        <div class="text-right" style="margin-top: 20px;"><div class="grand-total">Total: JMD $${totalAmount.toFixed(2)}</div></div>
      </div>
    </body></html>`;
};

export default function PreAlertsPage() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [newAlert, setNewAlert] = useState({ customerId: '', trackingNumber: '', contents: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const preAlertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'pre_alerts'));
  }, [firestore]);
  const { data: preAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  const handleCreateAlert = async () => {
    const selectedUser = users?.find(u => u.id === newAlert.customerId);
    if (!selectedUser || !newAlert.trackingNumber || !newAlert.contents) {
      toast({ title: 'Missing Fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const alertData = {
      customerName: selectedUser.fullName,
      customerId: selectedUser.id,
      trackingNumber: newAlert.trackingNumber,
      contents: newAlert.contents,
      status: 'Pending' as const,
      submissionDate: serverTimestamp(),
      invoiceHtml: '', uploadedInvoiceUrl: '', 
    };
    addDoc(collection(firestore, 'users', selectedUser.id, 'pre_alerts'), alertData)
      .then(() => {
        toast({ title: 'Pre-Alert Created' });
        setOpen(false);
        setNewAlert({ customerId: '', trackingNumber: '', contents: '' });
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${selectedUser.id}/pre_alerts`,
            operation: 'create',
            requestResourceData: alertData
        }));
      })
      .finally(() => setIsSubmitting(false));
  };
  
  const handleShipmentCreated = async (preAlert: PreAlert, cost: number) => {
    const batch = writeBatch(firestore);
    const invoiceId = `INV-${Date.now()}`;
    const invoiceHtml = generateInvoiceHtml({
      invoiceId, customerName: preAlert.customerName, invoiceDate: new Date(),
      lineItems: [{ description: preAlert.contents, quantity: 1, price: cost }], totalAmount: cost,
    });
    batch.set(doc(firestore, 'invoices', invoiceId), {
        invoiceId, customerId: preAlert.customerId, customerName: preAlert.customerName,
        date: serverTimestamp(), amount: cost, status: 'Unpaid', invoiceUrl: invoiceHtml,
    });
    batch.set(doc(collection(firestore, 'users', preAlert.customerId, 'shipments')), {
        customerId: preAlert.customerId, trackingNumber: preAlert.trackingNumber, contents: preAlert.contents,
        status: 'Processed', shippingDate: serverTimestamp(), cost, paymentStatus: 'Unpaid', invoiceId, invoiceUrl: invoiceHtml,
    });
    batch.update(doc(firestore, 'users', preAlert.customerId, 'pre_alerts', preAlert.id), { status: 'Processed' });
    batch.commit()
      .then(() => toast({ title: "Shipment Created" }))
      .catch(() => toast({ title: "Error creating shipment", variant: "destructive" }));
  }

  if (isLoadingUsers || isLoadingPreAlerts) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pre-Alerts</h1>
          <p className="text-muted-foreground">Manage incoming pre-alerts and process them into shipments.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Create Pre-Alert</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>New Pre-Alert</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Customer</Label>
                    <Select onValueChange={(value) => setNewAlert({...newAlert, customerId: value})} >
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Tracking #</Label><Input value={newAlert.trackingNumber} onChange={(e) => setNewAlert({...newAlert, trackingNumber: e.target.value})} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Contents</Label><Input value={newAlert.contents} onChange={(e) => setNewAlert({...newAlert, contents: e.target.value})} className="col-span-3" /></div>
                </div>
                <DialogFooter><Button onClick={handleCreateAlert} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming Pre-Alerts</CardTitle>
          <CardDescription>Review customer-submitted invoices and tracking numbers.</CardDescription>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preAlerts?.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.customerName}</TableCell>
                    <TableCell className="font-mono">{alert.trackingNumber}</TableCell>
                    <TableCell>{alert.contents}</TableCell>
                    <TableCell>
                      {alert.submissionDate && typeof alert.submissionDate.toDate === 'function' 
                        ? alert.submissionDate.toDate().toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                    <TableCell><Badge variant={getStatusVariant(alert.status)}>{alert.status}</Badge></TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                          <ViewReceiptDialog preAlert={alert} />
                          <CreateShipmentDialog preAlert={alert} onShipmentCreated={handleShipmentCreated} />
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
                {preAlerts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No incoming pre-alerts.</TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ViewReceiptDialog({ preAlert }: { preAlert: PreAlert }) {
  const { toast } = useToast();
  
  const handleDownload = () => {
    if (!preAlert.uploadedInvoiceUrl) return;
    
    const link = document.createElement('a');
    link.href = preAlert.uploadedInvoiceUrl;
    link.download = `Invoice-${preAlert.trackingNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloading Invoice",
      description: `The file for tracking ${preAlert.trackingNumber} is being saved.`
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!preAlert.uploadedInvoiceUrl}>
          <FileText className="mr-2 h-4 w-4 text-primary" />
          View Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Receipt for {preAlert.trackingNumber}</DialogTitle>
          <DialogDescription>
            Submitted by {preAlert.customerName} on {preAlert.submissionDate && typeof preAlert.submissionDate.toDate === 'function' ? preAlert.submissionDate.toDate().toLocaleDateString() : 'N/A'}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 mt-4 min-h-[400px]">
          {preAlert.uploadedInvoiceUrl ? (
             preAlert.uploadedInvoiceUrl.startsWith('data:application/pdf') ? (
                <iframe 
                  src={preAlert.uploadedInvoiceUrl} 
                  className="w-full h-full min-h-[500px]" 
                  title="Invoice PDF"
                />
             ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={preAlert.uploadedInvoiceUrl} 
                  alt="Customer Invoice" 
                  className="w-full h-auto object-contain"
                />
             )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No invoice file attached to this pre-alert.
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          <Button onClick={handleDownload} disabled={!preAlert.uploadedInvoiceUrl}>
            <Download className="mr-2 h-4 w-4" /> Download Original
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateShipmentDialog({ preAlert, onShipmentCreated }: { preAlert: PreAlert, onShipmentCreated: (p: PreAlert, cost: number) => void }) {
    const [open, setOpen] = useState(false);
    const [cost, setCost] = useState('');
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm" disabled={preAlert.status === 'Processed'}>Create Shipment</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create Shipment</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Tracking #</Label><Input value={preAlert.trackingNumber} readOnly disabled /></div>
                    <div className="space-y-2"><Label>Cost (JMD $)</Label><Input type="number" placeholder="5500.00" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => { onShipmentCreated(preAlert, parseFloat(cost)); setOpen(false); }}>Confirm</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}