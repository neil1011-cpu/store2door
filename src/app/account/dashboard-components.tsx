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
                            {recentShipment.shippingDate?.toDate ? recentShipment.shippingDate.toDate().toLocaleString() : 'N/A'}
                        </span>
                    </div>
                </div>

                {recentShipment.status === 'Arrived in Jamaica' && (
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle>Package in Jamaica!</AlertTitle>
                        <AlertDescription className="text-xs">
                            Your package has arrived at our hub and is currently clearing customs.
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
                    Notify us of an incoming package to ensure faster customs clearance.
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

export function PreAlertTab({ customerId, customerName, prefilledTrackingNumber }: { customerId: string, customerName: string, prefilledTrackingNumber?: string }) {
  const [trackingNumber, setTrackingNumber] = useState(prefilledTrackingNumber || '');
  const [contents, setContents] = useState('');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    if (prefilledTrackingNumber) setTrackingNumber(prefilledTrackingNumber);
  }, [prefilledTrackingNumber]);

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
        toast({ title: 'Missing Fields', description: 'Please complete all fields.', variant: 'destructive'});
        return;
    }

    if (invoice.size > 800 * 1024) {
      toast({ title: 'File Too Large', description: 'Please use a file under 800KB.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
        const uploadedInvoiceUrl = await fileToDataUri(invoice);
        const preAlertsCollection = collection(firestore, 'users', customerId, 'pre_alerts');
        const newPreAlert = {
            customerName,
            customerId,
            trackingNumber: trackingNumber.trim().toUpperCase(),
            contents,
            status: 'Pending' as const,
            submissionDate: serverTimestamp(),
            invoiceHtml: '', 
            uploadedInvoiceUrl
        };
        
        await addDoc(preAlertsCollection, newPreAlert);

        toast({ title: 'Pre-Alert Submitted!', description: 'We will process your package as soon as it arrives.' });
        setTrackingNumber(''); setContents(''); setInvoice(null);
    } catch (error: any) {
        toast({ title: 'Submission Error', variant: 'destructive'});
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Create Pre-Alert</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2"><Label>Tracking Number</Label><Input placeholder="JMXXX..." value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Contents</Label><Input placeholder="e.g., Electronics" value={contents} onChange={(e) => setContents(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Invoice (PDF or Image)</Label><Input type="file" accept="image/*,.pdf" onChange={(e) => setInvoice(e.target.files ? e.target.files[0] : null)} /></div>
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Pre-Alert'}</Button>
                </form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Pre-Alert History</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Tracking #</TableHead><TableHead>Contents</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoadingPreAlerts ? (
                            <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : preAlerts && preAlerts.length > 0 ? (
                            preAlerts.map(alert => (
                                <TableRow key={alert.id}>
                                    <TableCell className="font-mono">{alert.trackingNumber}</TableCell>
                                    <TableCell>{alert.contents}</TableCell>
                                    <TableCell><Badge variant={alert.status === 'Processed' ? 'secondary' : 'destructive'}>{alert.status}</Badge></TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No pre-alerts yet.</TableCell></TableRow>
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
    toast({ title: "Redirecting...", description: `Redirecting to payment for JMD $${shipment.cost?.toFixed(2)}` });
  };

  const preAlertMap = new Map(userPreAlerts?.map(pa => [pa.trackingNumber.toUpperCase(), pa]));
  const isLoading = isLoadingShipments || isLoadingPreAlerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Packages</CardTitle>
        <CardDescription>Real-time status of your shipments and invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost (JMD)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : userShipments && userShipments.length > 0 ? (
                userShipments.map((shipment) => {
                  const hasPreAlert = preAlertMap.has(shipment.trackingNumber.toUpperCase());
                  const needsInvoice = !hasPreAlert && shipment.status !== 'Delivered';
                  return (
                    <TableRow key={shipment.id}>
                        <TableCell className="font-mono font-bold">
                            {shipment.trackingNumber}
                            {needsInvoice && <span className="block text-[10px] text-orange-600 font-bold uppercase animate-pulse">Invoice Required</span>}
                        </TableCell>
                        <TableCell><Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge></TableCell>
                        <TableCell className="font-medium">{shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'TBD'}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {needsInvoice && (
                                    <Button size="sm" variant="outline" className="h-8 bg-orange-500 text-white hover:bg-orange-600" onClick={() => { setSelectedTrackingNumber(shipment.trackingNumber); setIsPreAlertDialogOpen(true); }}>
                                        <UploadCloud className="h-4 w-4 mr-2" /> Upload Invoice
                                    </Button>
                                )}
                                {shipment.paymentStatus === 'Unpaid' && shipment.cost ? (
                                    <Button size="sm" onClick={() => handlePayNow(shipment)} className="h-8"><CreditCard className="h-4 w-4 mr-2" /> Pay</Button>
                                ) : (
                                    <Badge variant="outline">{shipment.paymentStatus === 'Paid' ? 'Paid' : 'Awaiting Invoice'}</Badge>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                  );
                })
            ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No shipments found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isPreAlertDialogOpen} onOpenChange={setIsPreAlertDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Upload Invoice for {selectedTrackingNumber}</DialogTitle></DialogHeader>
                <PreAlertTab customerId={customerId} customerName={customerName} prefilledTrackingNumber={selectedTrackingNumber} />
                <DialogFooter><Button variant="outline" onClick={() => setIsPreAlertDialogOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const { toast } = useToast();
    const [isCopying, setIsCopying] = useState(false);

    const copyAddress = () => {
        const addr = `${details.fullName}\n${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;
        navigator.clipboard.writeText(addr);
        setIsCopying(true);
        toast({ title: "Address Copied!", description: "You can now paste this at your store's checkout." });
        setTimeout(() => setIsCopying(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Your Global Shipping Address</CardTitle>
                    <CardDescription>Use this address exactly as shown when shopping online.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-6 rounded-lg font-mono relative group">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 dummy-copy-btn opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={copyAddress}
                        >
                            {isCopying ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <p>{details.fullName}</p>
                        <p>{details.address.address1}</p>
                        <p className="font-bold text-primary">{details.address.address2}</p>
                        <p>{details.address.city}, {details.address.state} {details.address.zip}</p>
                    </div>
                    <Alert className="bg-primary/5 border-primary/20">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle>Shopping Tip</AlertTitle>
                        <AlertDescription className="text-xs">
                            Always include your Mailbox Number ({details.mailboxNumber}) in the "Address Line 2" field to ensure your package is routed correctly.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Your personal registration details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase font-semibold">Mailbox Number</span>
                            <span className="font-bold text-primary">{details.mailboxNumber}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase font-semibold">TRN</span>
                            <span>{details.trn}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase font-semibold">Phone</span>
                            <span>{details.phone}</span>
                        </div>
                         <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase font-semibold">Email</span>
                            <span>{details.email}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function SupportTab({ details }: { details: UserProfile }) {
    const supportPhone = "18765069727";
    const whatsappUrl = `https://wa.me/${supportPhone}?text=Hi FromStore2Door, I need help with my account (Mailbox: ${details.mailboxNumber})`;

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LifeBuoy className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">How can we help you today?</CardTitle>
                <CardDescription>
                    Our customer support team is available via WhatsApp for real-time assistance.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="bg-muted/30 p-6 rounded-xl border border-dashed text-center">
                    <p className="text-muted-foreground mb-4">For the fastest response regarding tracking, billing, or general inquiries, chat with us directly.</p>
                    <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold h-14 px-8">
                        <Link href={whatsappUrl} target="_blank">
                           <WhatsAppIcon className="w-6 h-6 mr-3" />
                           Open WhatsApp Chat
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                    <div className="p-4 border rounded-lg flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                            <p className="font-semibold text-sm">Response Time</p>
                            <p className="text-xs text-muted-foreground">Typically within 1 hour during business hours.</p>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                            <p className="font-semibold text-sm">Local Hub</p>
                            <p className="text-xs text-muted-foreground">Portmore, St. Catherine, Jamaica.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

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

export function CustomsCalculatorTab() {
    const [price, setPrice] = useState('');
    const [weight, setWeight] = useState('');
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const p = parseFloat(price) || 0;
        const w = parseFloat(weight) || 0;
        // Simple mock logic matching official pricing
        const freight = w * 450; 
        const duty = p > 100 ? p * 0.2 : 0;
        setResult(freight + duty * 156);
    };

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle>Total Landed Cost Estimator</CardTitle>
                <CardDescription>Estimate your shipping and customs fees (JMD).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Item Value (USD)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Weight (lbs)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} /></div>
                <Button onClick={calculate} className="w-full">Calculate Estimate</Button>
                {result !== null && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Estimated Total:</p>
                        <p className="text-3xl font-black text-primary">JMD ${result.toLocaleString()}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function LifeBuoy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  );
}