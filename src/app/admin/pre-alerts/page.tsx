
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft, Loader2, Download, FileText, Zap, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Pending': 
    case 'Pre-Alert':
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
        <div class="header"><h1>INVOICE</h1><div><strong>FromStore2Door</strong><br>Florida, USA</div></div>
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
  const [isFetchingLogicware, setIsFetchingLogicware] = useState(false);
  const [logicwarePreAlerts, setLogicwarePreAlerts] = useState<PreAlert[]>([]);
  
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
  const { data: firebasePreAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  const fetchLogicwarePreAlerts = async () => {
    try {
      setIsFetchingLogicware(true);
      const response = await fetch('/api/admin/logicware-shipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              apiKey: localStorage.getItem('LOGICWARE_API_KEY')
          })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Sync failed');

      const rawShipments = Array.isArray(data) ? data : data.shipments || data.data || [];
      
      // Filter for pre-alerts or pending warehouse intakes and exhaustively map fields
      const mappedPreAlerts: PreAlert[] = rawShipments
        .filter((s: any) => {
            const status = (s.status?.name || s.status || '').toLowerCase();
            return status.includes('pre-alert') || status.includes('pending') || status.includes('received');
        })
        .map((s: any) => ({
            id: `lw-${s.id}`,
            trackingNumber: s.trackingNumber || s.referenceCode || s.reference_code || 'N/A',
            customerName: s.shipperName || s.customer_name || s.shipper?.name || 'Logicware Client',
            customerId: s.shipperId || s.customer_id || '',
            contents: s.contents || s.description || s.item_description || 'Incoming Package',
            status: 'Pending', 
            submissionDate: s.createdAt || s.created_at || new Date().toISOString(),
            invoiceHtml: '',
            uploadedInvoiceUrl: s.invoiceUrl || s.invoice_url || '',
            source: 'logicware',
            isLogicware: true
        }));

      const all = [...(firebasePreAlerts || []), ...mappedPreAlerts];

      console.log(
        '[FINAL DATA]',
        {
          logicwareArray: mappedPreAlerts,
          total: all.length,
        }
      );

      toast({
        title: 'Success',
        description: `Loaded ${all.length} worldwide records`,
      });
      
      setLogicwarePreAlerts(mappedPreAlerts);
      
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsFetchingLogicware(false);
    }
  };

  useEffect(() => {
      fetchLogicwarePreAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinedPreAlerts = useMemo(() => {
      const fb = (firebasePreAlerts || []).map(pa => ({ ...pa, source: 'firebase' as const, isLogicware: false }));
      return [...fb, ...logicwarePreAlerts].sort((a, b) => {
          const dateA = a.submissionDate?.toMillis?.() || new Date(a.submissionDate).getTime() || 0;
          const dateB = b.submissionDate?.toMillis?.() || new Date(b.submissionDate).getTime() || 0;
          return dateB - dateA;
      });
  }, [firebasePreAlerts, logicwarePreAlerts]);

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
      trackingNumber: newAlert.trackingNumber.toUpperCase(),
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
    
    // Only update firebase records status
    if (!preAlert.isLogicware) {
        batch.update(doc(firestore, 'users', preAlert.customerId, 'pre_alerts', preAlert.id), { status: 'Processed' });
    }

    batch.commit()
      .then(() => {
          toast({ title: "Shipment Created" });
          if (preAlert.isLogicware) {
              setLogicwarePreAlerts(prev => prev.filter(p => p.id !== preAlert.id));
          }
      })
      .catch(() => toast({ title: "Error creating shipment", variant: "destructive" }));
  }

  if (isLoadingUsers || isLoadingPreAlerts) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Loading Worldwide Alerts...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worldwide Pre-Alerts</h1>
          <p className="text-muted-foreground">Manage incoming notifications and process them into active shipments.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwarePreAlerts} variant="outline" disabled={isFetchingLogicware} className="border-primary/20 hover:bg-primary/5">
                {isFetchingLogicware ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync External Hub
            </Button>
            <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Create Pre-Alert</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>New Pre-Alert</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs font-bold uppercase">Customer</Label>
                    <Select onValueChange={(value) => setNewAlert({...newAlert, customerId: value})} >
                        <SelectTrigger className="col-span-3 h-11"><SelectValue placeholder="Select Account" /></SelectTrigger>
                        <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id} className="font-medium">{u.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs font-bold uppercase">Tracking #</Label><Input value={newAlert.trackingNumber} onChange={(e) => setNewAlert({...newAlert, trackingNumber: e.target.value})} className="col-span-3 h-11 font-mono uppercase" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs font-bold uppercase">Contents</Label><Input value={newAlert.contents} onChange={(e) => setNewAlert({...newAlert, contents: e.target.value})} className="col-span-3 h-11" /></div>
                </div>
                <DialogFooter><Button onClick={handleCreateAlert} disabled={isSubmitting} className="w-full h-11 font-bold uppercase tracking-tight">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Alert"}</Button></DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-md overflow-hidden border-none">
        <CardHeader className="bg-muted/10">
          <CardTitle>Incoming Pre-Alerts</CardTitle>
          <CardDescription>Review customer-submitted invoices and synchronized records from global hubs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Source</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedPreAlerts.map((alert) => (
                  <TableRow key={alert.id} className={cn("hover:bg-muted/30 transition-colors", alert.isLogicware && "bg-blue-50/30 dark:bg-blue-950/10")}>
                    <TableCell className="pl-6">
                        {alert.isLogicware ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[9px] font-bold">Logicware Hub</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 uppercase text-[9px] font-bold">Local OS</Badge>
                        )}
                    </TableCell>
                    <TableCell className="font-bold text-sm">{alert.customerName}</TableCell>
                    <TableCell className="font-mono font-black text-primary uppercase">{alert.trackingNumber}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{alert.contents}</TableCell>
                    <TableCell className="text-xs">
                      {alert.submissionDate && typeof alert.submissionDate.toDate === 'function' 
                        ? alert.submissionDate.toDate().toLocaleDateString() 
                        : (typeof alert.submissionDate === 'string' ? new Date(alert.submissionDate).toLocaleDateString() : 'N/A')}
                    </TableCell>
                    <TableCell><Badge variant={getStatusVariant(alert.status)} className="px-3">{alert.status}</Badge></TableCell>
                     <TableCell className="text-right pr-6">
                       <div className="flex justify-end gap-2">
                          <ViewReceiptDialog preAlert={alert} />
                          <CreateShipmentDialog preAlert={alert} onShipmentCreated={handleShipmentCreated} />
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
                {combinedPreAlerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground italic">No incoming pre-alerts detected.</TableCell>
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
        <Button variant="outline" size="sm" className="h-8 font-bold" disabled={!preAlert.uploadedInvoiceUrl}>
          <FileText className="mr-2 h-3.5 w-3.5 text-primary" />
          Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="uppercase italic tracking-tighter">Receipt for {preAlert.trackingNumber}</DialogTitle>
          <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Submitted by {preAlert.customerName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 mt-4 min-h-[400px] flex items-center justify-center">
          {preAlert.uploadedInvoiceUrl ? (
             preAlert.uploadedInvoiceUrl.startsWith('data:application/pdf') || preAlert.uploadedInvoiceUrl.toLowerCase().endsWith('.pdf') ? (
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
                  className="max-w-full h-auto object-contain shadow-2xl"
                />
             )
          ) : (
            <div className="text-center space-y-2 opacity-30">
              <FileText className="h-12 w-12 mx-auto" />
              <p className="text-xs font-bold uppercase tracking-widest">No invoice file attached</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild><Button variant="outline">Close Overview</Button></DialogClose>
          <Button onClick={handleDownload} disabled={!preAlert.uploadedInvoiceUrl} className="h-10 font-bold uppercase tracking-tight">
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
            <DialogTrigger asChild><Button variant="secondary" size="sm" className="h-8 font-bold" disabled={preAlert.status === 'Processed'}>Process</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter">Authorize Global Shipment</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                         <Zap className="h-8 w-8 text-primary" />
                         <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Converting Record</p>
                            <p className="font-mono font-black text-lg text-primary">{preAlert.trackingNumber}</p>
                         </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Shipping & Logistics Cost (JMD $)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs opacity-40">JMD $</span>
                            <Input type="number" placeholder="5500.00" value={cost} onChange={(e) => setCost(e.target.value)} className="pl-16 h-12 text-lg font-black border-2" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={() => { onShipmentCreated(preAlert, parseFloat(cost)); setOpen(false); }} className="h-11 px-8 font-black uppercase tracking-tight">Finalize Intake</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
