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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
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
            {(isLoadingShipments || !isMounted) ? (
              <CardContent className="pt-6">
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                            <p className="font-mono font-bold text-lg">{recentShipment.trackingNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
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
                        <span className="text-muted-foreground block text-xs uppercase font-semibold">Contents</span>
                        <span className="font-medium text-foreground">{recentShipment.contents || recentShipment.description || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-muted-foreground block text-xs uppercase font-semibold">Last Update</span>
                        <span className="font-medium text-foreground">
                            {formatDate(recentShipment.shippingDate || recentShipment.createdAt)}
                        </span>
                    </div>
                </div>

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
      return query(collection(firestore, 'users', customerId, 'pre_alerts'));
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
      
      const external = logicwareShipments.filter(s => !localTracking.has((s.trackingNumber || s.referenceCode || '').toUpperCase()));
      
      return [...local, ...external].sort((a, b) => {
          const dateA = a.shippingDate?.toMillis?.() || (a.shippingDate ? new Date(a.shippingDate).getTime() : 0) || 0;
          const dateB = b.shippingDate?.toMillis?.() || (b.shippingDate ? new Date(b.shippingDate).getTime() : 0) || 0;
          return dateB - dateA;
      });
  }, [userShipments, logicwareShipments]);

  const isLoading = isLoadingShipments || isLoadingPreAlerts || isFetchingLw || !isMounted;

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
            {isLoading && combinedPackages.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : combinedPackages.length > 0 ? (
                combinedPackages.map((shipment) => {
                  const hasPreAlert = shipment.trackingNumber ? preAlertMap.has(shipment.trackingNumber.toUpperCase()) : false;
                  const needsInvoice = !hasPreAlert && (shipment.status || '').toLowerCase() !== 'delivered';
                  return (
                    <TableRow key={shipment.id} className={cn(shipment.isLogicware && "bg-blue-50/20")}>
                        <TableCell className="font-mono font-bold">
                            <div className="flex flex-col gap-1">
                                <span>{shipment.trackingNumber || shipment.referenceCode}</span>
                                {shipment.isLogicware && (
                                    <Badge variant="outline" className="w-fit text-[9px] h-4 py-0 uppercase">External Hub</Badge>
                                )}
                                {needsInvoice && <span className="block text-[10px] text-orange-600 font-bold uppercase animate-pulse">Invoice Required</span>}
                            </div>
                        </TableCell>
                        <TableCell><Badge variant={getStatusVariant(shipment.status)}>{shipment.status || 'Pending'}</Badge></TableCell>
                        <TableCell className="font-medium">{shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'TBD'}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {needsInvoice && (
                                    <Button size="sm" variant="outline" className="h-8 bg-orange-500 text-white hover:bg-orange-600" onClick={() => { setSelectedTrackingNumber(shipment.trackingNumber); setIsPreAlertDialogOpen(true); }}>
                                        <UploadCloud className="h-4 w-4 mr-2" /> Upload Invoice
                                    </Button>
                                )}
                                {shipment.paymentStatus === 'Unpaid' && (shipment.cost || 0) > 0 ? (
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
                <PreAlertTab customerId={customerId} customerName={mailboxNumber || 'Customer'} prefilledTrackingNumber={selectedTrackingNumber} onSuccess={() => setIsPreAlertDialogOpen(false)} />
                <DialogFooter><Button variant="outline" onClick={() => setIsPreAlertDialogOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function PreAlertTab({ customerId, customerName, prefilledTrackingNumber, onSuccess }: { customerId: string, customerName: string, prefilledTrackingNumber?: string, onSuccess?: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [trackingNumber, setTrackingNumber] = useState(prefilledTrackingNumber || '');
    const [contents, setContents] = useState('');
    const [invoiceBase64, setInvoiceBase64] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setInvoiceBase64(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber || !contents || !invoiceBase64) {
            toast({ title: "Missing Fields", description: "Tracking #, contents, and invoice are required.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'users', customerId, 'pre_alerts'), {
                customerName,
                customerId,
                trackingNumber: trackingNumber.toUpperCase(),
                contents,
                status: 'Pending',
                submissionDate: serverTimestamp(),
                uploadedInvoiceUrl: invoiceBase64,
                invoiceHtml: ''
            });

            toast({ title: "Pre-Alert Submitted", description: "Our warehouse team will be notified of your incoming package." });
            setTrackingNumber('');
            setContents('');
            setInvoiceBase64(null);
            onSuccess?.();
        } catch (error: any) {
            toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-60">Tracking Number</Label>
                    <Input 
                        placeholder="e.g. 1Z9999W..." 
                        value={trackingNumber} 
                        onChange={e => setTrackingNumber(e.target.value)}
                        className="font-mono h-11 border-2"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-60">What's inside?</Label>
                    <Input 
                        placeholder="e.g. Shoes, Electronics" 
                        value={contents} 
                        onChange={e => setContents(e.target.value)}
                        className="h-11 border-2"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-60">Upload Invoice (Image or PDF)</Label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/20 relative group hover:bg-muted/30 transition-colors">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        required
                    />
                    {!invoiceBase64 ? (
                        <div className="space-y-2">
                            <UploadCloud className="h-10 w-10 mx-auto text-primary opacity-40 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Select Invoice File</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-bold uppercase text-xs">
                            <CheckCircle2 className="h-5 w-5" /> File Selected & Ready
                        </div>
                    )}
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-black uppercase italic shadow-xl">
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                Authorize Pre-Alert
            </Button>
        </form>
    );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States
    const [phone, setPhone] = useState(details.phone || '');
    const [trn, setTrn] = useState(details.trn || '');
    
    // Address & Personnel States
    const [newPerson, setNewPerson] = useState({ name: '', idNumber: '' });
    const [newAddress, setNewAddress] = useState({ name: '', address: '', parish: '' });

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground p-6">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Your US Shipping Hub</CardTitle>
                        <CardDescription className="text-primary-foreground/70 font-bold text-[10px] uppercase tracking-widest">Use this address at checkout world-wide.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 font-mono text-sm leading-relaxed border-x border-b rounded-b-xl bg-muted/5">
                        <div className="space-y-1">
                            <p className="font-black text-primary uppercase text-xs tracking-widest opacity-60">Full Name</p>
                            <p className="font-bold text-lg">{details.fullName}</p>
                        </div>
                        <Separator className="my-4 opacity-10" />
                        <div className="space-y-1">
                            <p className="font-black text-primary uppercase text-xs tracking-widest opacity-60">Shipping Address</p>
                            <p className="text-base">{details.address.address1}</p>
                            <p className="bg-orange-100 dark:bg-orange-950/40 px-3 py-1 rounded text-orange-600 font-black inline-block mt-2 border border-orange-200">
                                {details.address.address2}
                            </p>
                            <p className="mt-1">{details.address.city}, {details.address.state} {details.address.zip}</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-6 w-full border-2 font-black uppercase tracking-tighter italic h-12" onClick={() => {
                            const addr = `${details.fullName}\n${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;
                            navigator.clipboard.writeText(addr);
                            toast({ title: "Identity Copied", description: "Global shipping address ready for checkout." });
                        }}>
                            <Copy className="h-4 w-4 mr-2" /> Copy Full Logistics Identity
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm font-bold uppercase opacity-60">Personal Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase">Phone Number</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase">Tax Registration Number (TRN)</Label>
                            <Input value={trn} onChange={e => setTrn(e.target.value)} className="h-11 border-2" maxLength={9} />
                        </div>
                        <Button onClick={handleUpdateProfile} disabled={isSaving} className="w-full h-11 font-bold uppercase tracking-tight">
                            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Secure Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase opacity-60">Authorized Pickup Personnel</CardTitle>
                        <Dialog>
                            <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-8 text-primary font-bold"><PlusCircle className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Authorize Personnel</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Government ID Number</Label><Input value={newPerson.idNumber} onChange={e => setNewPerson({...newPerson, idNumber: e.target.value})} /></div>
                                    <Button onClick={handleAddPickup} className="w-full font-bold uppercase">Confirm Authorization</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {details.pickupPersonnel?.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-bold">{p.name}</TableCell>
                                        <TableCell className="text-xs opacity-60">{p.idNumber}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePickup(p)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!details.pickupPersonnel || details.pickupPersonnel.length === 0) && (
                                    <TableRow><TableCell className="text-center italic opacity-30 py-8">No personnel authorized.</TableCell></TableRow>
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
        <div className="max-w-2xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-2">
                <div className="bg-purple-100 dark:bg-purple-950/40 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LifeBuoy className="h-10 w-10 text-purple-600" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Worldwide Support Hub</h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Your dedicated logistics lifeline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:bg-green-50 hover:border-green-200 transition-all group" asChild>
                    <Link href="https://wa.me/18765069727" target="_blank">
                        <svg className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.328-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.136 1.36.117 1.871.053.571-.072 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.03c0 2.122.554 4.197 1.607 6.048L0 24l6.233-1.635a11.84 11.84 0 005.808 1.51h.005c6.637 0 12.032-5.395 12.036-12.032a11.817 11.815 0 00-3.41-8.423z"/></svg>
                        <span className="font-black uppercase tracking-tighter italic">WhatsApp Support</span>
                    </Link>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:bg-blue-50 hover:border-blue-200 transition-all group" asChild>
                    <Link href="mailto:info@fromstore2door.com">
                        <Mail className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="font-black uppercase tracking-tighter italic">Email Helpdesk</span>
                    </Link>
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-muted/30">
                <CardHeader><CardTitle className="text-sm font-bold uppercase opacity-60">Common Questions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-background rounded-lg border">
                        <p className="font-bold text-sm">Where is my mailbox number?</p>
                        <p className="text-xs text-muted-foreground mt-1">Your mailbox (e.g. FSTD101) is displayed prominently on your dashboard and the Account tab.</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg border">
                        <p className="font-bold text-sm">How long does shipping take?</p>
                        <p className="text-xs text-muted-foreground mt-1">Air freight typically takes 2-4 business days after arriving at our Florida warehouse.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Item Value (USD)</Label><Input type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Weight (LBS)</Label><Input type="number" placeholder="0.00" value={weight} onChange={e => setWeight(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Category</Label>
                    <Select onValueChange={setCategory} defaultValue={category}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GENERAL">General Goods (20%)</SelectItem>
                            <SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0%)</SelectItem>
                            <SelectItem value="AUTO_PARTS">Auto Parts (30%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleCalculate} className="w-full h-11 font-black uppercase tracking-tight">Run Landed Cost Estimate</Button>
            </div>

            <Card className={cn("border-2 transition-all", calculation.calculated ? "border-primary/20 shadow-xl" : "border-dashed opacity-50")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Grand Total Estimate</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase">JMD</span>
                        <Switch checked={displayCurrency === 'JMD'} onCheckedChange={c => setDisplayCurrency(c ? 'JMD' : 'USD')} />
                    </div>
                </CardHeader>
                <CardContent className="text-center py-8">
                    {calculation.calculated ? (
                        <div className="space-y-6">
                            <span className="text-5xl font-black tracking-tighter italic">{format(calculation.total)}</span>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase opacity-60">
                                <div className="text-left"><p>Freight</p><p className="text-foreground">{format(calculation.freight)}</p></div>
                                <div className="text-right"><p>Customs</p><p className={cn(calculation.isDutyFree ? "text-green-600" : "text-foreground")}>{calculation.isDutyFree ? "FREE" : format(calculation.customsTotal)}</p></div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 italic text-muted-foreground">Enter details to see breakdown</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
