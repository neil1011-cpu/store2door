
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2, Search, CheckCircle2, AlertCircle, Zap, RefreshCw, Eye, Info, Package, FileText, Download, ShieldAlert, History, Weight, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import type { Shipment, UserProfile, ShipmentStatus } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, doc, updateDoc, serverTimestamp, orderBy, increment, writeBatch } from 'firebase/firestore';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const getStatusVariant = (status: ShipmentStatus | string | undefined) => {
  const safeStatus = status || 'Pending';
  switch (safeStatus) {
    case 'In Transit':
    case 'Being Shipped':
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
    case 'On Route':
        return 'default'
    default:
      return 'default';
  }
};

const OFFICIAL_STATUSES: ShipmentStatus[] = [
    'Pending',
    'Pre-Alert',
    'Received at Warehouse (FL)',
    'Processed',
    'In Review',
    'Being Shipped',
    'In Transit',
    'Arrived in Jamaica',
    'Customs',
    'On Route',
    'Delivered'
];

export default function ShippingPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingShipment, setViewingShipment] = useState<(Shipment & { user?: Partial<UserProfile> }) | null>(null);
  const [editingShipment, setEditingShipment] = useState<(Shipment & { user?: Partial<UserProfile> }) | null>(null);
  const [isFetchingLogicware, setIsFetchingLogicware] = useState(false);
  const [logicwareShipments, setLogicwareShipments] = useState<any[]>([]);

  const firestore = useFirestore();

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'shipments'));
  }, [firestore]);
  const { data: firebaseShipments, isLoading: isLoadingShipments, error: firebaseError } = useCollection<Shipment>(shipmentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('fullName', 'asc'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const loading = isLoadingShipments || isLoadingUsers;

  const combinedShipments = useMemo(() => {
    const firebaseData = (firebaseShipments || []).map(s => ({ ...s, source: 'firebase' as const }));
    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    
    const mappedFirebase = firebaseData.map(shipment => ({
        ...shipment,
        user: usersMap.get(shipment.customerId),
        isLogicware: false
    }));

    const mappedLogicware = logicwareShipments.map((s: any) => ({
        id: `lw-${s.id}`,
        trackingNumber: s.trackingNumber || s.referenceCode || s.reference_code || 'NO-REF',
        internalBarcode: s.internalBarcode || s.internal_barcode || s.barcode || '',
        contents: s.contents || s.description || s.item_description || 'Global Package',
        description: s.contents || s.description || s.item_description || 'Global Package',
        status: s.status?.name || s.status_name || s.status || 'In Transit',
        sourceMarketplace: s.sourceMarketplace || s.marketplace || s.source_marketplace || 'N/A',
        weight: Number(s.weight || s.weight_lbs || 0),
        cost: Number(s.totalAmount || s.total_amount || s.cost || s.price || 0),
        source: 'logicware' as const,
        isLogicware: true,
        customerId: s.shipperId || '',
        shippingDate: s.createdAt || s.created_at || new Date().toISOString(),
    }));

    const all = [...mappedFirebase, ...mappedLogicware].sort((a, b) => {
        const dateA = a.shippingDate?.toMillis?.() || new Date(a.shippingDate).getTime() || 0;
        const dateB = b.shippingDate?.toMillis?.() || new Date(b.shippingDate).getTime() || 0;
        return dateB - dateA;
    });

    if (!searchTerm) return all;
    const lowerTerm = searchTerm.toLowerCase();
    return all.filter(s => 
        (s.trackingNumber || '').toLowerCase().includes(lowerTerm) || 
        ((s as any).user?.fullName || '').toLowerCase().includes(lowerTerm) ||
        ((s as any).shipperName || '').toLowerCase().includes(lowerTerm) ||
        (s.contents || '').toLowerCase().includes(lowerTerm)
    );
  }, [firebaseShipments, logicwareShipments, users, searchTerm]);

  const fetchLogicwareData = async () => {
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
      if (!response.ok) throw new Error(data?.message || 'Server Error');
      const logicwareArray = Array.isArray(data) ? data : data.shipments || [];
      setLogicwareShipments(logicwareArray);
    } catch (error: any) {
      toast({ title: 'Hub Sync Failed', description: error?.message || 'Connection error', variant: 'destructive' });
    } finally {
      setIsFetchingLogicware(false);
    }
  };

  useEffect(() => {
      fetchLogicwareData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateShipment = async (shipment: Shipment & { user?: Partial<UserProfile> }, updates: { status?: string, cost?: number, weight?: number }) => {
      try {
          const docRef = doc(firestore, 'users', shipment.customerId, 'shipments', shipment.id);
          const batch = writeBatch(firestore);

          const finalUpdates: any = {
              ...updates,
              updatedAt: serverTimestamp()
          };

          // If cost changed, adjust wallet balance
          if (updates.cost !== undefined && updates.cost !== shipment.cost) {
              const diff = shipment.cost! - updates.cost; // If new cost is higher, diff is negative
              batch.update(doc(firestore, 'users', shipment.customerId), {
                  walletBalance: increment(diff)
              });
              
              // Also update linked invoice if exists
              if (shipment.invoiceId) {
                  batch.update(doc(firestore, 'invoices', shipment.invoiceId), {
                      amount: updates.cost
                  });
              }
          }

          batch.update(docRef, finalUpdates);

          // Log Activity
          await fetch('/api/log-activity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  type: 'shipment_update',
                  description: `Shipment ${shipment.trackingNumber} updated. Status: ${updates.status || shipment.status}, Cost: JMD $${(updates.cost || shipment.cost)?.toFixed(2)}`,
                  userId: 'admin',
                  userName: 'System Admin',
                  metadata: { trackingNumber: shipment.trackingNumber, ...updates }
              })
          });

          // Notify Customer via Email if status changed
          if (updates.status && updates.status !== shipment.status && shipment.user?.email) {
              await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      to: shipment.user.email,
                      subject: `Status Update: Package ${shipment.trackingNumber}`,
                      body: `Hi ${shipment.user.fullName || 'Valued Customer'},\n\nYour package with tracking number ${shipment.trackingNumber} has been updated.\n\nNew Status: ${updates.status}\n\nYou can track the live progress of your shipment in your account dashboard.\n\nThank you for shipping with FromStore2Door!`,
                      recipientName: shipment.user.fullName
                  })
              });
          }

          await batch.commit();
          toast({ title: "Registry Updated", description: "Shipment details and user wallet synchronized." });
          setEditingShipment(null);
      } catch (err: any) {
          toast({ title: "Update Failed", description: err.message, variant: "destructive" });
      }
  };

  if (loading && !firebaseError) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Worldwide Ledger...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Worldwide Shipping Ledger</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Unified monitoring of local and international transits</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareData} variant="outline" disabled={isFetchingLogicware} className="font-bold border-primary/20">
                <RefreshCw className={cn("mr-2 h-4 w-4", isFetchingLogicware && "animate-spin")} />Sync Hub
            </Button>
            <Button variant="outline" asChild className="font-bold"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        </div>
      </div>

      {firebaseError && (
          <Alert variant="destructive" className="border-2 shadow-lg">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle className="font-black uppercase italic tracking-tight">Sync Failure Detected</AlertTitle>
              <AlertDescription className="text-xs font-medium uppercase tracking-widest leading-relaxed mt-1">
                  The real-time listener was unable to connect to the subcollection group. Sorting handled in-memory.
              </AlertDescription>
          </Alert>
      )}

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" /> Global Shipment Registry
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Complete history of active and delivered parcels.</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search worldwide tracking..." className="pl-9 h-11 border-2 focus:border-primary shadow-inner uppercase font-bold text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="h-12">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Source</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Tracking ID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Customer</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Cost (JMD)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {combinedShipments.map((shipment) => (
                    <TableRow key={shipment.id} className={cn("hover:bg-primary/5 transition-colors h-16", shipment.isLogicware && "bg-blue-50/20")}>
                    <TableCell className="pl-6">
                        <Badge variant="outline" className={cn("uppercase text-[9px] font-black italic tracking-widest border-2", shipment.isLogicware ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-green-100 text-green-700 border-green-200")}>
                            {shipment.isLogicware ? 'Hub' : 'Local'}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-black text-primary uppercase text-sm tracking-tighter">{shipment.trackingNumber}</TableCell>
                    <TableCell className="font-bold text-[11px] uppercase tracking-tighter">
                        {(shipment as any).user?.fullName || shipment.shipperName || 'N/A'}
                    </TableCell>
                    <TableCell className="font-black text-xs">
                        JMD ${shipment.cost?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell><Badge variant={getStatusVariant(shipment.status)} className="px-3 py-1 text-[9px] font-black uppercase italic tracking-widest border-2">{shipment.status || 'Pending'}</Badge></TableCell>
                    <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                            {!shipment.isLogicware && (
                                <Button variant="secondary" size="sm" onClick={() => setEditingShipment(shipment as any)} className="h-9 font-black uppercase italic text-[10px] px-4">
                                    <Edit className="h-3.5 w-3.5 mr-1" /> Update
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setViewingShipment(shipment as any)} className="h-9 font-black border-2 uppercase tracking-tighter text-[10px]">
                                <Eye className="h-3.5 w-3.5 mr-2" /> Details
                            </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                {combinedShipments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-64">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <RefreshCw className="h-10 w-10 animate-spin" />
                                <p className="text-xs font-black uppercase italic tracking-tighter">Syncing Records...</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <ShipmentDetailsDialog shipment={viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)} />
      <EditShipmentDialog shipment={editingShipment} onSave={handleUpdateShipment} onOpenChange={(open) => !open && setEditingShipment(null)} />
    </div>
  );
}

function EditShipmentDialog({ shipment, onSave, onOpenChange }: { shipment: (Shipment & { user?: Partial<UserProfile> }) | null, onSave: (s: any, updates: any) => Promise<void>, onOpenChange: (open: boolean) => void }) {
    const [status, setStatus] = useState(shipment?.status || '');
    const [weight, setWeight] = useState(shipment?.weight?.toString() || '');
    const [cost, setCost] = useState(shipment?.cost?.toString() || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (shipment) {
            setStatus(shipment.status);
            setWeight(shipment.weight?.toString() || '');
            setCost(shipment.cost?.toString() || '');
        }
    }, [shipment]);

    // Recalculate cost when weight changes manually in edit
    const handleWeightChange = (val: string) => {
        setWeight(val);
        if (val && !isNaN(parseFloat(val))) {
            setCost(calculateShippingCost(parseFloat(val)).toString());
        }
    };

    const handleConfirm = async () => {
        if (!shipment) return;
        setIsSaving(true);
        await onSave(shipment, {
            status,
            weight: parseFloat(weight) || 0,
            cost: parseFloat(cost) || 0
        });
        setIsSaving(false);
    };

    return (
        <Dialog open={!!shipment} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-center">Modify Package Data</DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Adjust transit state and financial metrics</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                        <p className="text-[10px] font-bold uppercase opacity-60">Package Reference</p>
                        <p className="font-mono font-black text-lg text-primary">{shipment?.trackingNumber}</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Logistics Status</Label>
                        <Select onValueChange={setStatus} value={status}>
                            <SelectTrigger className="h-12 border-2 text-sm font-bold uppercase italic"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {OFFICIAL_STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold uppercase text-xs italic">{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Weight (LBS)</Label>
                            <div className="relative">
                                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                                <Input type="number" value={weight} onChange={(e) => handleWeightChange(e.target.value)} className="pl-10 h-12 text-lg font-black border-2" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Cost (JMD $)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs opacity-40">JMD $</span>
                                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="pl-16 h-12 text-lg font-black border-2" />
                            </div>
                        </div>
                    </div>

                    <Alert className="bg-blue-50 border-blue-100">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed">
                            Changes to the cost will automatically update the customer's wallet balance and linked invoice.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="ghost" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={isSaving} className="flex-1 h-12 font-black uppercase italic tracking-tight shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ShipmentDetailsDialog({ shipment, onOpenChange }: { shipment: (Shipment & { user?: Partial<UserProfile> }) | null, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    if (!shipment) return null;

    const handleDownloadReceipt = () => {
        if (!shipment.uploadedInvoiceUrl) return;
        const link = document.createElement('a');
        link.href = shipment.uploadedInvoiceUrl;
        link.download = `Invoice-${shipment.trackingNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Downloading Receipt", description: "The commercial invoice is being saved." });
    };

    return (
        <Dialog open={!!shipment} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 justify-center">
                         <Package className="h-8 w-8 text-primary" />
                         Shipment: {shipment.trackingNumber}
                    </DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Global Logistics Detailed View</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        <div className="space-y-6">
                            <Card className="bg-muted/30 border-none shadow-inner rounded-2xl">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border shadow-sm">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer</Label>
                                        <p className="text-sm font-black uppercase">{shipment.user?.fullName || 'N/A'}</p>
                                    </div>
                                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border shadow-sm">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Status</Label>
                                        <Badge variant={getStatusVariant(shipment.status)} className="font-black italic uppercase px-4">{shipment.status || 'Pending'}</Badge>
                                    </div>
                                    <Separator className="opacity-10" />
                                    <div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 block">Package Contents</Label>
                                        <p className="text-sm font-bold uppercase italic tracking-tight bg-background p-3 rounded-xl border">{shipment.contents || 'No description.'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background p-3 rounded-xl border">
                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Weight</Label>
                                            <p className="text-xl font-black italic tracking-tighter">{shipment.weight || 0} lbs</p>
                                        </div>
                                        <div className="bg-background p-3 rounded-xl border border-green-100">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-green-600 opacity-60">Total Cost</Label>
                                            <p className="text-xl font-black italic tracking-tighter text-green-600">JMD ${shipment.cost?.toFixed(2) || '0.00'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-3 w-3" /> Supporting Documentation
                                </h4>
                                {shipment.uploadedInvoiceUrl ? (
                                    <div className="p-5 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 flex items-center justify-between group transition-all hover:bg-orange-50">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-orange-100 p-3 rounded-xl shadow-inner"><FileText className="h-6 w-6 text-orange-600" /></div>
                                            <div>
                                                <p className="text-xs font-black uppercase italic tracking-tighter">Commercial Invoice</p>
                                                <p className="text-[9px] font-bold text-orange-600/70 uppercase tracking-widest">Provided by User</p>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={handleDownloadReceipt} className="font-black uppercase tracking-widest text-[10px] h-10 px-4 shadow-lg group-hover:scale-105 transition-transform">
                                            <Download className="h-4 w-4 mr-2" /> Download
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-12 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center opacity-30 bg-muted/10">
                                        <ShieldAlert className="h-10 w-10 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No User Upload Detected</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 block text-center">Global Documentation Preview</Label>
                            <div className="aspect-[3/4] w-full rounded-2xl border-4 bg-white overflow-hidden shadow-2xl flex items-center justify-center relative">
                                {shipment.uploadedInvoiceUrl ? (
                                    shipment.uploadedInvoiceUrl.startsWith('data:application/pdf') ? (
                                        <iframe src={shipment.uploadedInvoiceUrl} className="w-full h-full border-none" title="Invoice PDF" />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shipment.uploadedInvoiceUrl} alt="Invoice" className="max-w-full h-full object-contain" />
                                    )
                                ) : (
                                    <div className="text-center p-8 space-y-4 opacity-10">
                                        <FileText className="h-24 w-24 mx-auto" />
                                        <p className="text-sm font-black uppercase italic tracking-tighter">Documentation Missing</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-6 border-t mt-4">
                    <DialogClose asChild><Button variant="outline" className="font-black uppercase h-12 px-10 tracking-widest text-[11px] border-2 w-full sm:w-auto">Close Overview</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
