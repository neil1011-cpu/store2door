
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, FileUp, Package, Loader2, CreditCard, MoreHorizontal, FileText, Download, PlusCircle, Trash2, Home, Calculator, Truck, DollarSign, Weight, Sun, Moon, Laptop, Clock, AlertCircle, Info, MapPin, CheckCircle2, UploadCloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { UserProfile, Shipment, PickupPerson, DropoffAddress, PreAlert, ShipmentStatus } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (status: ShipmentStatus) => {
  switch (status) {
    case 'In Transit': 
    case 'Being Shipped':
    case 'On Route':
        return 'default';
    case 'Customs': 
    case 'Processed':
    case 'In Review':
    case 'Received at Warehouse (FL)':
    case 'Arrived in Jamaica':
        return 'secondary';
    case 'Delivered': 
        return 'outline';
    case 'Pending': 
    case 'Pre-Alert':
        return 'destructive';
    default: 
        return 'default';
  }
};

const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
        case 'Received at Warehouse (FL)': return <WarehouseIcon className="h-4 w-4" />;
        case 'Arrived in Jamaica': return <MapPin className="h-4 w-4" />;
        case 'Delivered': return <CheckCircle2 className="h-4 w-4" />;
        case 'In Transit':
        case 'Being Shipped':
        case 'On Route':
            return <Truck className="h-4 w-4" />;
        default: return <Package className="h-4 w-4" />;
    }
}

const WarehouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7L12 3L21 7V21" />
        <path d="M9 21V11H15V21" />
    </svg>
)

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M12.012 2c-5.508 0-9.988 4.48-9.988 9.988 0 1.76.46 3.46 1.332 4.964L2 22l6.216-1.628c1.456.792 3.096 1.208 4.796 1.208 5.508 0 9.988-4.48 9.988-9.988S17.52 2 12.012 2zm0 18.284c-1.584 0-3.132-.424-4.488-1.228l-.324-.188-3.336.872.888-3.244-.208-.332c-.88-1.4-1.344-3.028-1.344-4.7 0-4.464 3.632-8.096 8.096-8.096s8.096 3.632 8.096 8.096c0 4.464-3.632 8.096-8.096 8.096zm4.568-6.192c-.248-.124-1.472-.728-1.7-.8-.228-.08-.396-.124-.56.124-.164.248-.64.8-.784.968-.144.168-.288.192-.536.068-.248-.124-1.048-.388-1.996-1.232-.736-.656-1.232-1.468-1.376-1.716-.144-.248-.016-.384.108-.508.112-.112.248-.284.372-.424.124-.144.164-.248.248-.412.084-.168.044-.316-.02-.44-.064-.124-.56-1.348-.768-1.848-.204-.492-.428-.424-.584-.432h-.5c-.172 0-.452.064-.688.312-.236.248-1 .824-1 2.012s.864 2.324.984 2.492c.12.168 1.7 2.596 4.116 3.64.576.248 1.024.396 1.376.508.58.184 1.108.156 1.524.092.464-.072 1.472-.604 1.68-1.188.208-.584.208-1.084.144-1.188-.064-.108-.228-.172-.476-.296z" />
    </svg>
);

export function DashboardTab({ details }: { details: UserProfile }) {
  const firestore = useFirestore();
  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore || !details) return null;
    return query(collection(firestore, 'users', details.id, 'shipments'), orderBy('shippingDate', 'desc'), limit(1));
  }, [firestore, details]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const recentShipment = shipments?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>A quick overview of your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border-primary/10 overflow-hidden shadow-md">
            <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Latest Shipment Status
                </CardTitle>
            </CardHeader>
            {isLoadingShipments ? (
              <CardContent className="pt-6">
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </CardContent>
            ) : recentShipment ? (
            <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            {getStatusIcon(recentShipment.status)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tracking Number</p>
                            <p className="font-mono font-bold text-lg">{recentShipment.trackingNumber}</p>
                        </div>
                    </div>
                    <Badge variant={getStatusVariant(recentShipment.status)} className="px-4 py-1">
                        {recentShipment.status}
                    </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="text-muted-foreground block text-xs uppercase font-semibold">Contents</span>
                        <span className="font-medium text-foreground">{recentShipment.contents}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-muted-foreground block text-xs uppercase font-semibold">Last Update</span>
                        <span className="font-medium text-foreground">
                            {recentShipment.shippingDate && typeof recentShipment.shippingDate.toDate === 'function' 
                                ? recentShipment.shippingDate.toDate().toLocaleString() 
                                : 'Processing...'}
                        </span>
                    </div>
                </div>

                {recentShipment.status === 'Arrived in Jamaica' && (
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle>Package in Jamaica!</AlertTitle>
                        <AlertDescription className="text-xs">
                            Your package has arrived at our Kingston hub and is currently clearing customs.
                        </AlertDescription>
                    </Alert>
                )}

                <Button variant="outline" className="w-full" asChild>
                    <Link href="/account/packages">View All Packages</Link>
                </Button>
            </CardContent>
             ) : (
                <CardContent className="pt-6">
                    <div className="text-center py-6 space-y-3">
                         <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                         <p className="text-muted-foreground italic">You have no active shipments at the moment.</p>
                    </div>
                </CardContent>
             )}
        </Card>
         <Card className="border-orange-100 dark:border-orange-900/30">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-orange-500" /> Create a Pre-Alert
                </CardTitle>
                 <CardDescription>
                    Upload your invoice to notify us of an incoming package for faster processing.
                </CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild className="bg-orange-500 hover:bg-orange-600">
                   <Link href="/account/pre-alert">Go to Pre-Alert</Link>
               </Button>
            </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

const generatePreAlertInvoiceHtml = (data: {
  customerName: string;
  trackingNumber: string;
  contents: string;
  submissionDate: Date;
}): string => {
  const { customerName, trackingNumber, contents, submissionDate } = data;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pro-Forma Invoice for ${trackingNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
        .container { max-width: 800px; margin: 40px auto; padding: 30px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 1.8em; color: #0d6efd; }
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
        .total-section { margin-top: 30px; text-align: right; }
        .total-section .grand-total { font-size: 1.4em; font-weight: bold; color: #dc3545; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; font-size: 0.9em; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PRO-FORMA INVOICE</h1>
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
             <p><span class="label">Tracking #:</span> ${trackingNumber}</p>
            <p><span class="label">Date:</span> ${submissionDate.toLocaleDateString()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
                <td>${contents}</td>
                <td class="text-right">TBD</td>
            </tr>
          </tbody>
        </table>
        <div class="total-section">
            <p class="grand-total">Amount Due: To Be Determined</p>
        </div>
        <div class="footer">
          <p>This is not a final bill. An official invoice with final costs will be generated once the shipment is processed.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export function PreAlertTab({ customerId, customerName, prefilledTrackingNumber }: { customerId: string, customerName: string, prefilledTrackingNumber?: string }) {
  const [trackingNumber, setTrackingNumber] = useState(prefilledTrackingNumber || '');
  const [contents, setContents] = useState('');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const preAlertsQuery = useMemoFirebase(() => {
    if (!firestore || !customerId) return null;
    return query(collection(firestore, 'users', customerId, 'pre_alerts'), orderBy('submissionDate', 'desc'));
  }, [firestore, customerId]);
  const { data: preAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !contents || !invoice) {
        toast({ title: 'Missing Fields', description: 'Please fill out all fields and upload an invoice.', variant: 'destructive'});
        return;
    }

    if (invoice.size > 700 * 1024) {
      toast({ 
        title: 'File Too Large', 
        description: 'Please upload an image smaller than 700KB. Try resizing or taking a lower quality photo.', 
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
        const uploadedInvoiceUrl = await fileToDataUri(invoice);
        const submissionDate = new Date();

        const invoiceHtml = generatePreAlertInvoiceHtml({
          customerName,
          trackingNumber,
          contents,
          submissionDate,
        });

        const preAlertsCollection = collection(firestore, 'users', customerId, 'pre_alerts');
        
        const newPreAlert = {
            customerName,
            customerId,
            trackingNumber: trackingNumber.trim().toUpperCase(),
            contents,
            status: 'Pending' as const,
            submissionDate: serverTimestamp(),
            invoiceHtml: invoiceHtml,
            uploadedInvoiceUrl: uploadedInvoiceUrl
        };
        
        addDoc(preAlertsCollection, newPreAlert)
          .catch(async (error) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${customerId}/pre_alerts`,
                operation: 'create',
                requestResourceData: newPreAlert
              }));
          });

        toast({ title: 'Pre-Alert Submitted!', description: 'We have received your pre-alert and will process it shortly.' });
        setTrackingNumber('');
        setContents('');
        setInvoice(null);
        
        const fileInput = document.getElementById('invoice-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';

    } catch (error: any) {
        toast({ title: 'Submission Error', description: 'There was an error processing your request.', variant: 'destructive'});
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Create Pre-Alert</CardTitle>
                <CardDescription>
                Let us know about an incoming package by providing the details and uploading the invoice.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="tracking-number">Tracking Number</Label>
                    <Input id="tracking-number" placeholder="Enter the package tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contents">Contents Description</Label>
                    <Input id="contents" placeholder="e.g., Nike shoes, Amazon order" value={contents} onChange={(e) => setContents(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoice-upload">Upload Invoice</Label>
                    <Input id="invoice-upload" type="file" accept="image/*,.pdf" onChange={(e) => setInvoice(e.target.files ? e.target.files[0] : null)} />
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Max size: 700KB. PDF or Image.
                    </p>
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Pre-Alert'}
                </Button>
                </form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Pre-Alert History</CardTitle>
                <CardDescription>
                Here is a list of your submitted pre-alerts and their current status.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Contents</TableHead>
                            <TableHead>Date Submitted</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingPreAlerts ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : preAlerts && preAlerts.length > 0 ? (
                            preAlerts.map(alert => (
                                <TableRow key={alert.id}>
                                    <TableCell className="font-mono">{alert.trackingNumber}</TableCell>
                                    <TableCell>{alert.contents}</TableCell>
                                    <TableCell>
                                      {alert.submissionDate && typeof alert.submissionDate.toDate === 'function' 
                                        ? new Date(alert.submissionDate.toDate()).toLocaleDateString() 
                                        : 'Processing...'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={alert.status === 'Processed' ? 'secondary' : 'destructive'}>{alert.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">You have no pre-alerts.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

export function PackagesTab({ customerId, customerName }: { customerId: string, customerName: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPreAlertDialogOpen, setIsPreAlertDialogOpen] = useState(false);
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState('');
  
  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore || !customerId) return null;
    return query(collection(firestore, 'users', customerId, 'shipments'), orderBy('shippingDate', 'desc'));
  }, [firestore, customerId]);
  const { data: userShipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const preAlertsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'users', customerId, 'pre_alerts'));
  }, [firestore, customerId]);
  const { data: userPreAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  const handlePayNow = (shipment: Shipment) => {
    toast({
        title: "Payment Gateway",
        description: `Redirecting to payment for invoice ${shipment.invoiceId} - Total: JMD $${shipment.cost?.toFixed(2)}`,
    });
  };

  const handleDownloadInvoice = (shipment: Shipment) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc || !shipment.invoiceUrl) {
          toast({ title: 'Could not print invoice', variant: 'destructive'});
          document.body.removeChild(iframe);
          return;
      }
      
      doc.open();
      doc.write(shipment.invoiceUrl);
      doc.close();
      
      setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
      }, 500);
  };

  const handleUploadPreAlert = (trackingNumber: string) => {
      setSelectedTrackingNumber(trackingNumber);
      setIsPreAlertDialogOpen(true);
  };

  const isLoading = isLoadingShipments || isLoadingPreAlerts;

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>My Packages</CardTitle>
                <CardDescription>Here is the status of all your shipments.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
        </Card>
    );
  }

  // Cross-reference shipments with pre-alerts to see which ones are missing
  const preAlertMap = new Map(userPreAlerts?.map(pa => [pa.trackingNumber, pa]));

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>My Packages</CardTitle>
        <CardDescription>Here is the live status of all your shipments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Contents</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userShipments && userShipments.map((shipment) => {
              const hasPreAlert = preAlertMap.has(shipment.trackingNumber);
              const isIntakenButNoInvoice = !hasPreAlert && (shipment.status === 'Received at Warehouse (FL)' || shipment.status === 'Processed' || shipment.status === 'Arrived in Jamaica');

              return (
              <TableRow key={shipment.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono font-bold">
                    <div className="flex flex-col">
                        <span>{shipment.trackingNumber}</span>
                        {isIntakenButNoInvoice && (
                            <span className="text-[10px] text-orange-600 font-bold uppercase animate-pulse">Invoice Required</span>
                        )}
                    </div>
                </TableCell>
                <TableCell>{shipment.contents}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getStatusVariant(shipment.status)} className="flex items-center gap-1.5 px-3 py-1 w-fit">
                        {getStatusIcon(shipment.status)}
                        {shipment.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                    {shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'N/A'}
                </TableCell>
                <TableCell>
                    {shipment.paymentStatus === 'Unpaid' && shipment.cost ? (
                        <Button size="sm" onClick={() => handlePayNow(shipment)} className="h-8">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay Now
                        </Button>
                    ) : (
                        <Badge variant={shipment.paymentStatus === 'Paid' ? 'outline' : 'secondary'}>
                            {shipment.paymentStatus === 'Paid' ? 'Paid' : (shipment.cost ? 'Awaiting Payment' : 'No Cost')}
                        </Badge>
                    )}
                </TableCell>
                 <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        {isIntakenButNoInvoice && (
                            <Button size="sm" variant="outline" className="h-8 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800" onClick={() => handleUploadPreAlert(shipment.trackingNumber)}>
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload Invoice
                            </Button>
                        )}
                        <Dialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={!shipment.invoiceUrl || !shipment.invoiceId}>
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">More actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem>
                                            <FileText className="mr-2 h-4 w-4" />
                                            View Invoice
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    {shipment.invoiceUrl && shipment.invoiceId && (
                                        <DropdownMenuItem onClick={() => handleDownloadInvoice(shipment)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Print/Save Invoice
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Invoice for {shipment.trackingNumber}</DialogTitle>
                                    <DialogDescription>Invoice for your shipment: {shipment.contents}.</DialogDescription>
                                </DialogHeader>
                                <div className="relative h-[600px] overflow-hidden rounded-md border">
                                    <iframe 
                                        srcDoc={shipment.invoiceUrl}
                                        title={`Invoice for ${shipment.trackingNumber}`}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 'none' }}
                                    />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                                    <Button onClick={() => handleDownloadInvoice(shipment)} disabled={!shipment.invoiceUrl}>
                                        <Download className="mr-2 h-4 w-4" /> Print to PDF
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                 </TableCell>
              </TableRow>
            )})}
             {!isLoading && (!userShipments || userShipments.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">You have no shipments.</TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isPreAlertDialogOpen} onOpenChange={setIsPreAlertDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Upload Invoice for {selectedTrackingNumber}</DialogTitle>
                <DialogDescription>
                    Provide the invoice for this package to avoid delays in customs clearance.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <PreAlertTab 
                    customerId={customerId} 
                    customerName={customerName} 
                    prefilledTrackingNumber={selectedTrackingNumber} 
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPreAlertDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export function SupportTab({ details }: { details: UserProfile }) {
    return (
        <Card className="overflow-hidden border-none shadow-xl">
            <div className="bg-[#25D366] p-8 text-white flex flex-col items-center justify-center text-center space-y-4">
                <WhatsAppIcon className="w-20 h-20 drop-shadow-lg" />
                <h3 className="text-3xl font-bold tracking-tight">WhatsApp Support</h3>
                <p className="text-white/90 max-w-md mx-auto leading-relaxed">
                    Get instant assistance from our support team. We're available to help with tracking, payments, and account inquiries.
                </p>
            </div>
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                 <div className="space-y-6 w-full max-w-sm">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 transition-colors hover:bg-muted">
                        <div className="bg-[#25D366]/10 p-3 rounded-full">
                            <Clock className="h-6 w-6 text-[#25D366]" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-sm">Response Time</p>
                            <p className="text-xs text-muted-foreground">Usually responds within minutes</p>
                        </div>
                    </div>
                    
                    <Button asChild size="lg" className="w-full h-14 text-lg font-bold shadow-lg transition-transform active:scale-95" style={{ backgroundColor: '#25D366', color: 'white' }}>
                        <Link href="https://wa.me/18765069727" target="_blank">
                             <WhatsAppIcon className="w-6 h-6 mr-3" />
                            Message Support Now
                        </Link>
                    </Button>
                    
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-semibold">
                        Available Mon-Sat: 9AM - 5PM
                    </p>
                 </div>
            </CardContent>
        </Card>
    );
}

const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20 },
  LAPTOPS_TABLETS: { duty: 0 },
  COMPUTERS: { duty: 0 },
  CELL_PHONES: { duty: 0.20 },
  CLOTHING: { duty: 0.20 },
  SHOES: { duty: 0.20 },
  AUTO_PARTS: { duty: 0.30 },
  COSMETICS: { duty: 0.20 },
  BOOKS: { duty: 0 },
  ELECTRONICS_OTHER: { duty: 0.20 },
};

const USD_TO_JMD_RATE = 156; 
const DE_MINIMIS_THRESHOLD = 100;
const INSURANCE_RATE = 0.015;
const SCF_RATE = 0.003;

const pricingTiers: Record<number, number> = {
    1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
    6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
    23: 9900, 24: 10200, 25: 10500, 26: 10850, 
    27: 11200, 28: 11550, 29: 11900, 30: 12250
};

type Category = keyof typeof CUSTOMS_RATES;

export function CustomsCalculatorTab() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('JMD');

  const [calculation, setCalculation] = useState({
    cost: 0,
    insurance: 0,
    freight: 0,
    cif: 0,
    importDuty: 0,
    scf: 0,
    caf: 0,
    customsTotal: 0,
    total: 0,
    isDutyFree: false,
    calculated: false,
  });

  const calculateShippingFromWeight = (weightLbs: number): number => {
    if (weightLbs <= 0) return 0;
    const roundedWeight = Math.ceil(weightLbs);
    let priceJMD = 0;
    
    if (roundedWeight in pricingTiers) {
        priceJMD = pricingTiers[roundedWeight];
    } else if (roundedWeight >= 11 && roundedWeight <= 22) {
        priceJMD = 4850 + (roundedWeight - 10) * 450;
    } else if (roundedWeight >= 31) {
        priceJMD = 12250 + (roundedWeight - 30) * 400;
    } else {
        priceJMD = 12250;
    }

    return priceJMD / USD_TO_JMD_RATE;
  };

  const getCAF = (valueUsd: number) => {
    if (valueUsd <= DE_MINIMIS_THRESHOLD) return 0;
    if (valueUsd <= 500) return 2500;
    if (valueUsd <= 1000) return 5000;
    if (valueUsd <= 2500) return 10000;
    if (valueUsd <= 5000) return 20000;
    return 40000;
  };

  const handleCalculate = () => {
    const itemPrice = parseFloat(price) || 0;
    const w = parseFloat(weight) || 0;
    const shippingCostUsd = calculateShippingFromWeight(w);
    
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            cost: itemPrice,
            insurance: 0,
            freight: shippingCostUsd,
            cif: itemPrice + shippingCostUsd,
            importDuty: 0,
            scf: 0,
            caf: 0,
            customsTotal: 0,
            total: shippingCostUsd,
            isDutyFree: true,
            calculated: true,
        });
        return;
    }

    const insurance = itemPrice * INSURANCE_RATE;
    const cif = itemPrice + insurance + shippingCostUsd;
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    const scf = cif * SCF_RATE;
    const cafJmd = getCAF(itemPrice);
    const cafUsd = cafJmd / USD_TO_JMD_RATE;
    const customsTotal = importDuty + scf + cafUsd;
    const total = shippingCostUsd + customsTotal;

    setCalculation({
      cost: itemPrice,
      insurance,
      freight: shippingCostUsd,
      cif,
      importDuty,
      scf,
      caf: cafUsd,
      customsTotal,
      total,
      isDutyFree: false,
      calculated: true,
    });
  };

  const formatCurrency = (value: number) => {
    const finalValue = displayCurrency === 'JMD' ? value * USD_TO_JMD_RATE : value;
    return finalValue.toLocaleString('en-US', { 
        style: 'currency', 
        currency: displayCurrency,
        minimumFractionDigits: displayCurrency === 'JMD' ? 0 : 2,
        maximumFractionDigits: displayCurrency === 'JMD' ? 0 : 2,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the item value and weight to estimate the total landed cost.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Item Value (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Items under $100 USD value are duty-free.
              </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="weight"
                        type="number"
                        placeholder="0.00"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <p className="text-xs text-muted-foreground">Used to automatically calculate shipping rates.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Item Category</Label>
              <Select onValueChange={(value: Category) => setCategory(value)} defaultValue={category}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Items (20% Duty)</SelectItem>
                  <SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0% Duty)</SelectItem>
                  <SelectItem value="COMPUTERS">Computers (0% Duty)</SelectItem>
                  <SelectItem value="CELL_PHONES">Cell Phones (20% Duty)</SelectItem>
                  <SelectItem value="CLOTHING">Clothing (20% Duty)</SelectItem>
                  <SelectItem value="SHOES">Shoes (20% Duty)</SelectItem>
                  <SelectItem value="AUTO_PARTS">Auto Parts (30% Duty)</SelectItem>
                  <SelectItem value="COSMETICS">Cosmetics (20% Duty)</SelectItem>
                  <SelectItem value="BOOKS">Books (Duty Free)</SelectItem>
                  <SelectItem value="ELECTRONICS_OTHER">Other Electronics (20% Duty)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalculate} className="w-full" size="lg">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Total Estimate
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col border-primary/20 shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle>Landed Cost Breakdown</CardTitle>
            <CardDescription>
              A complete summary of shipping fees and customs charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            {calculation.calculated ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="currency-toggle" className="text-sm font-semibold">
                      Display Currency: {displayCurrency}
                    </Label>
                  </div>
                  <Switch
                    id="currency-toggle"
                    checked={displayCurrency === 'JMD'}
                    onCheckedChange={(checked) => setDisplayCurrency(checked ? 'JMD' : 'USD')}
                  />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Shipping Cost (Freight)
                        </span>
                        <span className="font-bold">{formatCurrency(calculation.freight)}</span>
                    </div>
                    
                    <Separator />

                    {calculation.isDutyFree ? (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-blue-900">
                            <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle>Customs Duty Free!</AlertTitle>
                            <AlertDescription className="text-xs">
                                Value is $100 USD or less. No customs duties apply.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customs Charges</p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Import Duty (ID)</span>
                                <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Standard Compliance (SCF)</span>
                                <span className="font-medium">{formatCurrency(calculation.scf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Admin Fee (CAF)</span>
                                <span className="font-medium">{formatCurrency(calculation.caf)}</span>
                            </div>
                            <Separator className="bg-muted-foreground/20" />
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span>Customs Subtotal</span>
                                <span>{formatCurrency(calculation.customsTotal)}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="rounded-xl border-2 border-primary/20 p-6 bg-primary/5 text-center">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2 block">Grand Total Estimate</span>
                        <span className="text-5xl font-black text-primary tracking-tighter">
                            {formatCurrency(calculation.total)}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-4">
                            Exchange Rate Used: 1 USD = {USD_TO_JMD_RATE} JMD.
                        </p>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-64 items-center justify-center text-muted-foreground text-center space-y-4">
                <Calculator className="h-12 w-12 opacity-20" />
                <p className="italic max-w-[200px]">Enter package price and weight to see the full breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const userDocRef = doc(firestore, 'users', details.id);

    const fullAddress = `${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.zip}`;

    const [openAddPersonDialog, setOpenAddPersonDialog] = useState(false);
    const [newPerson, setNewPerson] = useState({ name: '', idNumber: '' });
    
    const [openAddAddressDialog, setOpenAddAddressDialog] = useState(false);
    const [newAddress, setNewAddress] = useState({ name: '', address: '', parish: '' });

    const handleCopy = () => {
        navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        toast({
            title: 'Address Copied!',
            description: 'Your US address has been copied to the clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddPerson = async () => {
        if (!newPerson.name || !newPerson.idNumber) {
            toast({ title: "Missing Fields", description: "Please enter a name and ID number.", variant: 'destructive' });
            return;
        }

        const personToAdd: PickupPerson = { ...newPerson, id: `person-${Date.now()}` };
        
        updateDoc(userDocRef, { pickupPersonnel: arrayUnion(personToAdd) })
          .then(() => {
            setNewPerson({ name: '', idNumber: '' });
            setOpenAddPersonDialog(false);
            toast({ title: "Pickup Person Added", description: `${newPerson.name} can now pick up packages on your behalf.` });
          })
          .catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: { pickupPersonnel: arrayUnion(personToAdd) }}));
          });
    };

    const handleRemovePerson = async (personToRemove: PickupPerson) => {
        updateDoc(userDocRef, { pickupPersonnel: arrayRemove(personToRemove) })
            .then(() => toast({ title: "Pickup Person Removed" }))
            .catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: { pickupPersonnel: arrayRemove(personToRemove) }}));
            });
    };

    const handleAddAddress = async () => {
        if (!newAddress.name || !newAddress.address || !newAddress.parish) {
            toast({ title: "Missing Fields", description: "Please fill out all address fields.", variant: 'destructive' });
            return;
        }

        const addressToAdd: DropoffAddress = { ...newAddress, id: `addr-${Date.now()}` };
        updateDoc(userDocRef, { dropoffAddresses: arrayUnion(addressToAdd) })
            .then(() => {
                 setNewAddress({ name: '', address: '', parish: '' });
                setOpenAddAddressDialog(false);
                toast({ title: "Address Added", description: `New drop-off address "${newAddress.name}" has been saved.` });
            })
            .catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: { dropoffAddresses: arrayUnion(addressToAdd) }}));
            });
    };

    const handleRemoveAddress = async (addressToRemove: DropoffAddress) => {
        updateDoc(userDocRef, { dropoffAddresses: arrayRemove(addressToRemove) })
            .then(() => toast({ title: "Address Removed" }))
            .catch(err => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: { dropoffAddresses: arrayRemove(addressToRemove) }}));
            });
    };
    
    const pickupPersonnel = details.pickupPersonnel || [];
    const dropoffAddresses = details.dropoffAddresses || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Account</CardTitle>
                <CardDescription>Your personal account details and US shipping address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2">Your US Address</h3>
                    <div className="relative rounded-lg border bg-muted p-4 space-y-1">
                        <p className="font-mono">{details.fullName}</p>
                        <p className="font-mono">{details.address.address1}</p>
                        <p className="font-mono font-bold text-primary">{details.address.address2}</p>
                        <p className="font-mono">{details.address.city}, {details.address.state} {details.zip}</p>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Use this address as your shipping destination when shopping from US stores.
                    </p>
                </div>
                <Separator />
                
                <div>
                    <h3 className="font-semibold text-lg mb-2">Appearance Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose your preferred application background.</p>
                    {mounted ? (
                        <RadioGroup
                        value={theme}
                        onValueChange={setTheme}
                        className="grid max-w-md grid-cols-3 gap-4"
                        >
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-accent", theme === 'light' && "border-primary bg-primary/5")}>
                            <Sun className="h-5 w-5"/>
                            <RadioGroupItem value="light" id="light" className="sr-only" />
                            <span>Light</span>
                        </Label>
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-accent", theme === 'dark' && "border-primary bg-primary/5")}>
                            <Moon className="h-5 w-5" />
                            <RadioGroupItem value="dark" id="dark" className="sr-only" />
                            <span>Dark</span>
                        </Label>
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-accent", theme === 'system' && "border-primary bg-primary/5")}>
                            <Laptop className="h-5 w-5" />
                            <RadioGroupItem value="system" id="system" className="sr-only" />
                            <span>System</span>
                        </Label>
                        </RadioGroup>
                    ) : (
                        <div className="grid max-w-md grid-cols-3 gap-4">
                            <Skeleton className="h-[90px]" />
                            <Skeleton className="h-[90px]" />
                            <Skeleton className="h-[90px]" />
                        </div>
                    )}
                </div>

                <Separator />

                <div>
                    <h3 className="font-semibold text-lg mb-2">Account Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Full Name:</span>
                            <span>{details.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{details.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone Number:</span>
                            <span>{details.phone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Mailbox Number:</span>
                            <span className="font-mono">{details.mailboxNumber}</span>
                        </div>
                    </div>
                </div>
                 <Separator />
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Drop-off Addresses</h3>
                        <Dialog open={openAddAddressDialog} onOpenChange={setOpenAddAddressDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Address
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Drop-off Address</DialogTitle>
                                    <DialogDescription>
                                        Add a new address in Jamaica for package deliveries.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="address-name">Address Name</Label>
                                        <Input id="address-name" placeholder="e.g., Home, Work, Mom's House" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address-street">Street Address</Label>
                                        <Input id="address-street" placeholder="e.g., 123 Sunshine Avenue" value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="address-parish">Parish</Label>
                                        <Input id="address-parish" placeholder="e.g., Kingston" value={newAddress.parish} onChange={e => setNewAddress({ ...newAddress, parish: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleAddAddress}>Add Address</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage your delivery addresses in Jamaica.
                    </p>
                    <div className="space-y-3">
                         {dropoffAddresses.length === 0 && (
                            <div className="text-center text-muted-foreground border rounded-lg p-8">
                                <p>No drop-off addresses added yet.</p>
                            </div>
                         )}
                         {dropoffAddresses.map(addr => (
                            <Card key={addr.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-muted p-3 rounded-full">
                                        <Home className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{addr.name}</p>
                                        <p className="text-sm text-muted-foreground">{addr.address}, {addr.parish}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveAddress(addr)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Address</span>
                                </Button>
                            </Card>
                         ))}
                    </div>
                </div>
                 <Separator />
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Pickup Personnel</h3>
                        <Dialog open={openAddPersonDialog} onOpenChange={setOpenAddPersonDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Person
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Pickup Person</DialogTitle>
                                    <DialogDescription>
                                        Add someone who is authorized to pick up packages on your behalf.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pickup-name">Full Name</Label>
                                        <Input id="pickup-name" placeholder="e.g., Jane Doe" value={newPerson.name} onChange={e => setNewPerson({ ...newPerson, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pickup-id">Government Issued ID #</Label>
                                        <Input id="pickup-id" placeholder="e.g., Driver's License or TRN" value={newPerson.idNumber} onChange={e => setNewPerson({ ...newPerson, idNumber: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleAddPerson}>Add Person</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage who can pick up packages for you. They must present their ID.
                    </p>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>ID Number</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pickupPersonnel.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No pickup personnel added.</TableCell>
                                    </TableRow>
                                )}
                                {pickupPersonnel.map(person => (
                                    <TableRow key={person.id}>
                                        <TableCell className="font-medium">{person.name}</TableCell>
                                        <TableCell>{person.idNumber}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemovePerson(person)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
