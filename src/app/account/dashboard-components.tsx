'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, FileUp, Package, Loader2, CreditCard, MoreHorizontal, FileText, Download, PlusCircle, Trash2, Home, Calculator, Truck, DollarSign, Weight, Sun, Moon, Laptop, Clock, AlertCircle, Info, MapPin, CheckCircle2, UploadCloud, LifeBuoy, Zap, UserPlus, Phone, User, X, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { UserProfile, Shipment, PreAlert, ShipmentStatus, DropoffAddress, PickupPerson } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, query, orderBy, limit, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';

const getStatusVariant = (status: ShipmentStatus | string | undefined) => {
  const safeStatus = (status || 'Pending').toLowerCase();
  if (safeStatus.includes('transit') || safeStatus.includes('shipped') || safeStatus.includes('route')) {
      return 'default';
  }
  if (safeStatus.includes('customs') || safeStatus.includes('processed') || safeStatus.includes('review') || safeStatus.includes('warehouse') || safeStatus.includes('jamaica')) {
      return 'secondary';
  }
  if (safeStatus.includes('delivered')) {
      return 'outline';
  }
  if (safeStatus.includes('pending') || safeStatus.includes('pre-alert')) {
      return 'destructive';
  }
  return 'default';
};

const getStatusIcon = (status: ShipmentStatus | string | undefined) => {
    const safeStatus = (status || '').toLowerCase();
    if (safeStatus.includes('warehouse')) return <WarehouseIcon className="h-4 w-4" />;
    if (safeStatus.includes('jamaica')) return <MapPin className="h-4 w-4" />;
    if (safeStatus.includes('delivered')) return <CheckCircle2 className="h-4 w-4" />;
    if (safeStatus.includes('transit') || safeStatus.includes('shipped')) return <Truck className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
}

const WarehouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7L12 3L21 7V21" />
        <path d="M9 21V11H15V21" />
    </svg>
)

export function DashboardTab({ details }: { details: UserProfile }) {
  const firestore = useFirestore();
  const [logicwarePackage, setLogicwarePackage] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore || !details?.id) return null;
    return query(collection(firestore, 'users', details.id, 'shipments'), orderBy('shippingDate', 'desc'), limit(1));
  }, [firestore, details?.id]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  useEffect(() => {
    const checkLogicware = async () => {
        if (!details?.mailboxNumber) return;
        try {
            const res = await fetch('/api/admin/logicware-shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mailbox: details.mailboxNumber })
            });
            const data = await res.json();
            if (data.success && data.shipments?.length > 0) {
                setLogicwarePackage(data.shipments[0]);
            }
        } catch (e) {}
    };
    checkLogicware();
  }, [details?.mailboxNumber]);

  const recentShipment = shipments?.[0] || logicwarePackage;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (!isMounted) return '...'; 
    try {
        if (date.toDate && typeof date.toDate === 'function') {
            return date.toDate().toLocaleString();
        }
        return new Date(date).toLocaleString();
    } catch (e) {
        return 'N/A';
    }
  };

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>A quick overview of your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6">
        <Card className="border-primary/10 overflow-hidden shadow-md">
            <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Latest Shipment Status
                </CardTitle>
            </CardHeader>
            {(isLoadingShipments || !isMounted) ? (
              <CardContent className="pt-6">
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </CardContent>
            ) : recentShipment ? (
            <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-muted/20 p-3 sm:p-4 rounded-lg gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full shrink-0">
                            {getStatusIcon(recentShipment.status)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tracking Number</p>
                            <p className="font-mono font-bold text-base sm:text-lg truncate">{recentShipment.trackingNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-0">
                        <Badge variant={getStatusVariant(recentShipment.status)} className="px-4 py-1">
                            {recentShipment.status || 'Pending'}
                        </Badge>
                        {recentShipment.isLogicware && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">
                                <Zap className="h-2 w-2 mr-1" /> External Hub
                            </Badge>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase font-semibold">Contents</span>
                        <span className="font-medium text-foreground">{recentShipment.contents || recentShipment.description || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase font-semibold">Last Update</span>
                        <span className="font-medium text-foreground">
                            {formatDate(recentShipment.shippingDate || recentShipment.createdAt)}
                        </span>
                    </div>
                </div>

                <Button variant="outline" className="w-full h-11 sm:h-10" asChild>
                    <Link href="/account/packages">View All Packages</Link>
                </Button>
            </CardContent>
             ) : (
                <CardContent className="pt-6">
                    <div className="text-center py-10 space-y-3">
                         <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                         <p className="text-muted-foreground italic text-sm">You have no active shipments at the moment.</p>
                    </div>
                </CardContent>
             )}
        </Card>
      </CardContent>
    </Card>
  );
}

export function PackagesTab({ customerId, mailboxNumber }: { customerId: string, mailboxNumber?: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPreAlertDialogOpen, setIsPreAlertDialogOpen] = useState(false);
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState('');
  const [logicwareShipments, setLogicwareShipments] = useState<any[]>([]);
  const [isFetchingLw, setIsFetchingLw] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore || !customerId) return null;
    return query(collection(firestore, 'users', customerId, 'shipments'), orderBy('shippingDate', 'desc'));
  }, [firestore, customerId]);
  const { data: userShipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const preAlertsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'users', customerId, 'pre_alerts'), orderBy('submissionDate', 'desc'));
  }, [firestore, customerId]);
  const { data: userPreAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  useEffect(() => {
    const fetchLw = async () => {
        if (!mailboxNumber) return;
        setIsFetchingLw(true);
        try {
            const res = await fetch('/api/admin/logicware-shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mailbox: mailboxNumber })
            });
            const data = await res.json();
            if (data.success) {
                setLogicwareShipments(data.shipments || []);
            }
        } catch (e) {} finally { setIsFetchingLw(false); }
    };
    fetchLw();
  }, [mailboxNumber]);

  const handlePayNow = (shipment: any) => {
    toast({ title: "Redirecting...", description: `Redirecting to payment for JMD $${shipment.cost?.toFixed(2)}` });
  };

  const preAlertMap = useMemo(() => {
      const map = new Map();
      userPreAlerts?.forEach(pa => {
          if (pa.trackingNumber) map.set(pa.trackingNumber.toUpperCase(), pa);
      });
      return map;
  }, [userPreAlerts]);
  
  const combinedPackages = useMemo(() => {
      const local = userShipments || [];
      const localTracking = new Set(local.map(s => (s.trackingNumber || '').toUpperCase()));
      
      const pendingAlerts = (userPreAlerts || []).filter(pa => pa.status === 'Pending' && !localTracking.has((pa.trackingNumber || '').toUpperCase()));
      
      const external = logicwareShipments.filter(s => !localTracking.has((s.trackingNumber || s.referenceCode || '').toUpperCase()));
      
      return [...local, ...pendingAlerts, ...external].sort((a, b) => {
          const dateA = (a as any).shippingDate?.toMillis?.() || (a as any).submissionDate?.toMillis?.() || (a.shippingDate ? new Date(a.shippingDate).getTime() : 0) || 0;
          const dateB = (b as any).shippingDate?.toMillis?.() || (b as any).submissionDate?.toMillis?.() || (b.shippingDate ? new Date(b.shippingDate).getTime() : 0) || 0;
          return dateB - dateA;
      });
  }, [userShipments, logicwareShipments, userPreAlerts]);

  const isLoading = isLoadingShipments || isLoadingPreAlerts || isFetchingLw || !isMounted;

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>My Packages</CardTitle>
        <CardDescription>Real-time status of your shipments and pre-alerts.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/50 sm:bg-transparent">
                <TableRow>
                <TableHead className="pl-4 sm:pl-0">Package Details</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell">Cost (JMD)</TableHead>
                <TableHead className="text-right pr-4 sm:pr-0">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && combinedPackages.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : combinedPackages.length > 0 ? (
                    combinedPackages.map((shipment) => {
                    const isPreAlert = (shipment as any).status === 'Pending' && !(shipment as any).shippingDate;
                    const hasPreAlert = shipment.trackingNumber ? preAlertMap.has(shipment.trackingNumber.toUpperCase()) : false;
                    const needsInvoice = !hasPreAlert && (shipment.status || '').toLowerCase() !== 'delivered' && !isPreAlert;
                    
                    return (
                        <TableRow key={shipment.id} className={cn(shipment.isLogicware && "bg-blue-50/20", isPreAlert && "bg-orange-50/10")}>
                            <TableCell className="pl-4 sm:pl-0">
                                <div className="flex flex-col gap-1.5 py-1">
                                    <span className="font-mono font-black text-sm sm:text-base tracking-tighter text-primary">
                                        {shipment.trackingNumber || (shipment as any).referenceCode}
                                    </span>
                                    <div className="flex flex-wrap gap-1 items-center">
                                        <Badge variant={getStatusVariant(shipment.status)} className="sm:hidden text-[9px] h-4 py-0">{shipment.status || 'Pending'}</Badge>
                                        {shipment.isLogicware && <Badge variant="outline" className="w-fit text-[8px] h-4 py-0 uppercase">External Hub</Badge>}
                                        {isPreAlert && <Badge variant="outline" className="w-fit text-[8px] h-4 py-0 uppercase bg-orange-100 text-orange-700">Pre-Alert</Badge>}
                                        <span className="sm:hidden text-[10px] font-bold">JMD ${shipment.cost?.toFixed(2) || 'TBD'}</span>
                                    </div>
                                    {needsInvoice && <span className="block text-[8px] text-orange-600 font-black uppercase animate-pulse tracking-widest">Invoice Required</span>}
                                </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell"><Badge variant={getStatusVariant(shipment.status)}>{shipment.status || 'Pending'}</Badge></TableCell>
                            <TableCell className="hidden sm:table-cell font-medium">{shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'TBD'}</TableCell>
                            <TableCell className="text-right pr-4 sm:pr-0">
                                <div className="flex justify-end gap-2">
                                    {needsInvoice && (
                                        <Button size="sm" variant="outline" className="h-9 sm:h-8 bg-orange-500 text-white hover:bg-orange-600 px-3" onClick={() => { setSelectedTrackingNumber(shipment.trackingNumber); setIsPreAlertDialogOpen(true); }}>
                                            <UploadCloud className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Upload Invoice</span>
                                        </Button>
                                    )}
                                    {shipment.paymentStatus === 'Unpaid' && (shipment.cost || 0) > 0 ? (
                                        <Button size="sm" onClick={() => handlePayNow(shipment)} className="h-9 sm:h-8 px-4"><CreditCard className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Pay</span><span className="sm:hidden">Pay</span></Button>
                                    ) : (
                                        <Badge variant="outline" className="hidden sm:inline-flex">{shipment.paymentStatus === 'Paid' ? 'Paid' : isPreAlert ? 'Awaiting Acknowledgment' : 'Awaiting Invoice'}</Badge>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                    })
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center h-32 text-muted-foreground text-sm italic">No shipments found.</TableCell></TableRow>
                )}
            </TableBody>
            </Table>
        </div>

        <Dialog open={isPreAlertDialogOpen} onOpenChange={setIsPreAlertDialogOpen}>
            <DialogContent className="sm:max-w-2xl w-[95vw] rounded-2xl">
                <DialogHeader><DialogTitle>Upload Invoice for {selectedTrackingNumber}</DialogTitle></DialogHeader>
                <PreAlertTab customerId={customerId} customerName={mailboxNumber || 'Customer'} prefilledTrackingNumber={selectedTrackingNumber} onSuccess={() => setIsPreAlertDialogOpen(false)} />
                <DialogFooter><Button variant="outline" className="w-full h-12" onClick={() => setIsPreAlertDialogOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function PreAlertTab({ customerId, customerName, prefilledTrackingNumber, onSuccess }: { customerId: string, customerName: string, prefilledTrackingNumber?: string, onSuccess?: () => void }) {
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [trackingNumber, setTrackingNumber] = useState(prefilledTrackingNumber || '');
    const [contents, setContents] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024 * 1024) {
                toast({ title: "File Too Large", description: "The maximum upload size is 500MB.", variant: "destructive" });
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber || !contents || !selectedFile) {
            toast({ title: "Missing Fields", description: "Tracking #, contents, and invoice are required.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const finalTracking = trackingNumber.toUpperCase();
            const storagePath = `invoices/${customerId}/${Date.now()}_${selectedFile.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, selectedFile);
            const downloadUrl = await getDownloadURL(storageRef);

            const preAlertsCollection = collection(firestore, 'users', customerId, 'pre_alerts');
            await addDoc(preAlertsCollection, {
                customerName,
                customerId,
                trackingNumber: finalTracking,
                contents,
                status: 'Pending',
                submissionDate: serverTimestamp(),
                uploadedInvoiceUrl: downloadUrl,
                invoiceHtml: ''
            });

            await fetch('/api/log-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'pre_alert_upload',
                    description: `User ${customerName} uploaded a new pre-alert for ${finalTracking}.`,
                    userId: customerId,
                    userName: customerName,
                    metadata: { trackingNumber: finalTracking, contents, fileUrl: downloadUrl }
                })
            });

            try {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: 'admin@neilussolutions.com',
                  subject: `New Pre-Alert Received: ${finalTracking}`,
                  body: `A new pre-alert has been submitted by ${customerName}.\n\nTracking Number: ${finalTracking}\nContents: ${contents}\n\nPlease check the admin panel to acknowledge and process this shipment.`,
                  recipientName: 'FSTD Admin'
                }),
              });
            } catch (emailErr) {}

            toast({ title: "Pre-Alert Submitted", description: "Our warehouse team has been notified of your incoming package." });
            setTrackingNumber('');
            setContents('');
            setSelectedFile(null);
            onSuccess?.();
        } catch (error: any) {
            toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <Label className="text-[10px] sm:text-xs font-bold uppercase opacity-60">Tracking Number</Label>
                    <Input 
                        placeholder="e.g. 1Z9999W..." 
                        value={trackingNumber} 
                        onChange={e => setTrackingNumber(e.target.value)}
                        className="font-mono h-12 border-2 text-base"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] sm:text-xs font-bold uppercase opacity-60">What's inside?</Label>
                    <Input 
                        placeholder="e.g. Shoes, Electronics" 
                        value={contents} 
                        onChange={e => setContents(e.target.value)}
                        className="h-12 border-2 text-base"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-bold uppercase opacity-60">Upload Invoice (Limit: 500MB)</Label>
                <div className="border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center bg-muted/20 relative group hover:bg-muted/30 transition-colors">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        required
                    />
                    {!selectedFile ? (
                        <div className="space-y-3">
                            <UploadCloud className="h-12 w-12 mx-auto text-primary opacity-40 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-black uppercase tracking-widest">Select Invoice File</p>
                            <p className="text-[10px] text-muted-foreground">PDF or Image up to 500MB</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 text-green-600 font-bold uppercase text-xs">
                            <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 className="h-8 w-8" /></div>
                            <div className="flex flex-col gap-1">
                                <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                                <span className="text-muted-foreground text-[10px]">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-black uppercase italic shadow-xl rounded-xl">
                {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Zap className="mr-2 h-6 w-6" />}
                Authorize Pre-Alert
            </Button>
        </form>
    );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [phone, setPhone] = useState(details.phone || '');
    const [trn, setTrn] = useState(details.trn || '');
    
    const [newPerson, setNewPerson] = useState({ name: '', idNumber: '' });

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'users', details.id), { phone, trn });
            toast({ title: "Profile Secured", description: "Your contact details have been updated." });
        } catch (e: any) {
            toast({ title: "Save Failed", description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPickup = async () => {
        if (!newPerson.name || !newPerson.idNumber) return;
        try {
            const person: PickupPerson = { id: `p-${Date.now()}`, ...newPerson };
            await updateDoc(doc(firestore, 'users', details.id), {
                pickupPersonnel: arrayUnion(person)
            });
            setNewPerson({ name: '', idNumber: '' });
            toast({ title: "Personnel Added" });
        } catch (e: any) {}
    };

    const handleRemovePickup = async (person: PickupPerson) => {
        try {
            await updateDoc(doc(firestore, 'users', details.id), {
                pickupPersonnel: arrayRemove(person)
            });
        } catch (e) {}
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-0">
            <div className="space-y-6">
                <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="bg-primary text-primary-foreground p-6">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Your US Shipping Hub</CardTitle>
                        <CardDescription className="text-primary-foreground/70 font-bold text-[10px] uppercase tracking-widest">Use this address at checkout world-wide.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 font-mono text-sm leading-relaxed border-x border-b rounded-b-2xl bg-muted/5">
                        <div className="space-y-1">
                            <p className="font-black text-primary uppercase text-[10px] tracking-widest opacity-60">Full Name</p>
                            <p className="font-bold text-lg">{details.fullName}</p>
                        </div>
                        <Separator className="my-4 opacity-10" />
                        <div className="space-y-1">
                            <p className="font-black text-primary uppercase text-[10px] tracking-widest opacity-60">Shipping Address</p>
                            <p className="text-base font-bold">{details.address.address1}</p>
                            <p className="bg-orange-100 dark:bg-orange-950/40 px-3 py-1 rounded text-orange-600 font-black inline-block mt-2 border border-orange-200">
                                {details.address.address2}
                            </p>
                            <p className="mt-1 font-medium">{details.address.city}, {details.address.state} {details.address.zip}</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-6 w-full border-2 font-black uppercase tracking-tighter italic h-14" onClick={() => {
                            const addr = `${details.fullName}\n${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;
                            navigator.clipboard.writeText(addr);
                            toast({ title: "Identity Copied", description: "Global shipping address ready for checkout." });
                        }}>
                            <Copy className="h-4 w-4 mr-2" /> Copy Logistics Identity
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm">
                    <CardHeader><CardTitle className="text-xs font-bold uppercase opacity-60 tracking-widest">Personal Identity</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase">Phone Number</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 border-2 text-base" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase">Tax Number (TRN)</Label>
                            <Input value={trn} onChange={e => setTrn(e.target.value)} className="h-12 border-2 text-base" maxLength={9} />
                        </div>
                        <Button onClick={handleUpdateProfile} disabled={isSaving} className="w-full h-12 font-black uppercase tracking-widest shadow-lg">
                            {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : "Secure Profile Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="rounded-2xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4">
                        <CardTitle className="text-xs font-bold uppercase opacity-60 tracking-widest">Authorized Pickup</CardTitle>
                        <Dialog>
                            <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-9 px-4 text-primary font-black uppercase text-[10px]"><PlusCircle className="h-4 w-4 mr-1.5" /> Add New</Button></DialogTrigger>
                            <DialogContent className="w-[95vw] rounded-2xl">
                                <DialogHeader><DialogTitle className="uppercase italic tracking-tighter">Authorize Personnel</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Full Name</Label><Input value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} className="h-12 border-2" /></div>
                                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Government ID Number</Label><Input value={newPerson.idNumber} onChange={e => setNewPerson({...newPerson, idNumber: e.target.value})} className="h-12 border-2" /></div>
                                    <Button onClick={handleAddPickup} className="w-full h-14 font-black uppercase italic tracking-tight shadow-xl">Confirm Authorization</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="p-0 min-h-[200px]">
                        <Table>
                            <TableBody>
                                {details.pickupPersonnel?.map(p => (
                                    <TableRow key={p.id} className="h-16">
                                        <TableCell className="font-bold text-sm uppercase pl-6">{p.name}</TableCell>
                                        <TableCell className="text-[10px] font-mono opacity-60">{p.idNumber}</TableCell>
                                        <TableCell className="text-right pr-4">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-full" onClick={() => handleRemovePickup(p)}>
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!details.pickupPersonnel || details.pickupPersonnel.length === 0) && (
                                    <TableRow><TableCell colSpan={3} className="text-center italic opacity-30 py-16 text-sm">No personnel authorized for pickup.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function SupportTab({ details }: { details: UserProfile }) {
    return (
        <div className="max-w-2xl mx-auto space-y-8 py-4 sm:py-8 px-4">
            <div className="text-center space-y-2">
                <div className="bg-purple-100 dark:bg-purple-950/40 h-24 w-24 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-xl">
                    <LifeBuoy className="h-12 w-12 text-purple-600" />
                </div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Worldwide Support</h2>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Your dedicated logistics lifeline.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="h-20 flex flex-row items-center justify-start gap-4 border-2 rounded-2xl hover:bg-green-50 hover:border-green-200 transition-all group px-6" asChild>
                    <Link href="https://wa.me/18765069727" target="_blank">
                        <div className="bg-green-100 p-3 rounded-full text-green-600 group-hover:scale-110 transition-transform">
                             <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.328-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.136 1.36.117 1.871.053.571-.072 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.03c0 2.122.554 4.197 1.607 6.048L0 24l6.233-1.635a11.84 11.84 0 005.808 1.51h.005c6.637 0 12.032-5.395 12.036-12.032a11.817 11.815 0 00-3.41-8.423z"/></svg>
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <span className="font-black uppercase tracking-tighter italic text-lg leading-none">WhatsApp Hub</span>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Instant Logistics Support</span>
                        </div>
                    </Link>
                </Button>
                <Button variant="outline" className="h-20 flex flex-row items-center justify-start gap-4 border-2 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group px-6" asChild>
                    <Link href="mailto:info@fromstore2door.com">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <span className="font-black uppercase tracking-tighter italic text-lg leading-none">Email Helpdesk</span>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Official Inquiry Channel</span>
                        </div>
                    </Link>
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-muted/30 rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b py-4"><CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Common Questions</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="p-4 bg-background rounded-xl border shadow-sm">
                        <p className="font-black text-sm uppercase italic tracking-tight">Where is my mailbox number?</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">Your mailbox (e.g. FSTD101) is displayed prominently on your dashboard and the Account tab.</p>
                    </div>
                    <div className="p-4 bg-background rounded-xl border shadow-sm">
                        <p className="font-black text-sm uppercase italic tracking-tight">How long does shipping take?</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">Air freight typically takes 2-4 business days after arriving at our Florida warehouse.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function CustomsCalculatorTab() {
    const [price, setPrice] = useState('');
    const [weight, setWeight] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('JMD');

    const [calculation, setCalculation] = useState({
        freight: 0, importDuty: 0, scf: 0, caf: 0, customsTotal: 0, total: 0, isDutyFree: false, calculated: false
    });

    const USD_TO_JMD_RATE = 156; 
    const DE_MINIMIS_THRESHOLD = 100;
    const INSURANCE_RATE = 0.015;
    const SCF_RATE = 0.003;
    const pricingTiers: Record<number, number> = { 1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550, 10: 4850, 30: 12250 };

    const handleCalculate = () => {
        const itemPrice = parseFloat(price) || 0;
        const w = Math.ceil(parseFloat(weight) || 0);
        let freightJmd = w > 0 ? (pricingTiers[w] || 4850 + (w - 10) * 450) : 0;
        if (w > 30) freightJmd = 12250 + (w - 30) * 400;
        
        const freightUsd = freightJmd / USD_TO_JMD_RATE;
        
        if (itemPrice <= DE_MINIMIS_THRESHOLD) {
            setCalculation({ freight: freightUsd, importDuty: 0, scf: 0, caf: 0, customsTotal: 0, total: freightUsd, isDutyFree: true, calculated: true });
            return;
        }

        const cif = itemPrice + (itemPrice * INSURANCE_RATE) + freightUsd;
        const dutyRate = category === 'AUTO_PARTS' ? 0.30 : (['LAPTOPS_TABLETS', 'COMPUTERS', 'BOOKS'].includes(category) ? 0 : 0.20);
        const importDuty = cif * dutyRate;
        const scf = cif * SCF_RATE;
        const cafUsd = (itemPrice <= 500 ? 2500 : (itemPrice <= 1000 ? 5000 : 10000)) / USD_TO_JMD_RATE;

        setCalculation({ freight: freightUsd, importDuty, scf, caf: cafUsd, customsTotal: importDuty + scf + cafUsd, total: freightUsd + importDuty + scf + cafUsd, isDutyFree: false, calculated: true });
    };

    const format = (v: number) => {
        const val = displayCurrency === 'JMD' ? v * USD_TO_JMD_RATE : v;
        return val.toLocaleString('en-US', { style: 'currency', currency: displayCurrency, minimumFractionDigits: 0 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-0">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Item Value (USD)</Label><Input type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} className="h-12 border-2 text-base" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label><Input type="number" placeholder="0.00" value={weight} onChange={e => setWeight(e.target.value)} className="h-12 border-2 text-base" /></div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Category</Label>
                    <Select onValueChange={setCategory} defaultValue={category}>
                        <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GENERAL" className="font-bold uppercase text-xs">General Goods (20%)</SelectItem>
                            <SelectItem value="LAPTOPS_TABLETS" className="font-bold uppercase text-xs">Laptops & Tablets (0%)</SelectItem>
                            <SelectItem value="AUTO_PARTS" className="font-bold uppercase text-xs">Auto Parts (30%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleCalculate} className="w-full h-14 text-lg font-black uppercase italic tracking-tight shadow-xl">Run Landed Cost Estimate</Button>
            </div>

            <Card className={cn("border-2 transition-all rounded-2xl", calculation.calculated ? "border-primary/20 shadow-xl" : "border-dashed opacity-50")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b bg-muted/20 rounded-t-2xl py-4 px-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Estimate</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase opacity-60">JMD</span>
                        <Switch checked={displayCurrency === 'JMD'} onCheckedChange={c => setDisplayCurrency(c ? 'JMD' : 'USD')} />
                    </div>
                </CardHeader>
                <CardContent className="text-center py-10 px-6">
                    {calculation.calculated ? (
                        <div className="space-y-8">
                            <span className="text-5xl sm:text-6xl font-black tracking-tighter italic block">{format(calculation.total)}</span>
                            <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest opacity-60 border-t pt-8">
                                <div className="text-left space-y-1"><p>Freight</p><p className="text-foreground text-sm font-black italic">{format(calculation.freight)}</p></div>
                                <div className="text-right space-y-1"><p>Customs</p><p className={cn(calculation.isDutyFree ? "text-green-600" : "text-foreground", "text-sm font-black italic")}>{calculation.isDutyFree ? "FREE" : format(calculation.customsTotal)}</p></div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                            <Calculator className="h-16 w-16" />
                            <p className="italic font-bold uppercase tracking-widest text-xs">Enter data to compute</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
