
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2, Search, PlusCircle, ScanLine, CheckCircle2, AlertCircle, Zap, RefreshCw, ShoppingCart, Weight, DollarSign, Store, Eye, Info, Package, Plane, MapPin, Ruler, ShieldAlert, History, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import type { Shipment, UserProfile, ShipmentStatus } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, doc, updateDoc, serverTimestamp, where, getDocs, writeBatch, orderBy } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
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

export default function ShippingPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<(Shipment & { user?: Partial<UserProfile> }) | null>(null);
  const [editableShipment, setEditableShipment] = useState<Shipment | null>(null);
  const [viewingShipment, setViewingShipment] = useState<Shipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLogicware, setIsFetchingLogicware] = useState(false);
  const [logicwareShipments, setLogicwareShipments] = useState<any[]>([]);

  const firestore = useFirestore();

  // Real-time listener for ALL shipments across all users
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
                  The real-time listener was unable to connect to the subcollection group. 
                  {firebaseError.message.includes('index') ? (
                      <span className="block mt-2 font-bold text-white bg-destructive px-2 py-1 rounded">
                          CRITICAL: A Firestore Index is required for this collection group.
                      </span>
                  ) : firebaseError.message}
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
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Invoice</TableHead>
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
                    <TableCell><Badge variant={getStatusVariant(shipment.status)} className="px-3 py-1 text-[9px] font-black uppercase italic tracking-widest border-2">{shipment.status || 'Pending'}</Badge></TableCell>
                    <TableCell>
                        {shipment.uploadedInvoiceUrl ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[9px] flex items-center gap-1 uppercase tracking-tighter shadow-inner">
                                <FileText className="h-3 w-3" /> Ready
                            </Badge>
                        ) : (
                            <span className="text-[9px] text-muted-foreground font-bold uppercase opacity-30">Missing</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" onClick={() => setViewingShipment(shipment as Shipment)} className="h-9 font-black border-2 uppercase tracking-tighter text-[10px]">
                            <Eye className="h-4 w-4 mr-2" /> Details
                        </Button>
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
    </div>
  );
}

function ShipmentDetailsDialog({ shipment, onOpenChange }: { shipment: Shipment | null, onOpenChange: (open: boolean) => void }) {
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
        toast({ title: "Downloading Receipt", description: "The commercial invoice is being saved to your device." });
    };

    return (
        <Dialog open={!!shipment} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-3 text-primary">
                        <Package className="h-8 w-8" />
                        <div>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Shipment: {shipment.trackingNumber}</DialogTitle>
                            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Global Logistics Detailed View</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        <div className="space-y-6">
                            <Card className="bg-muted/30 border-none shadow-inner rounded-2xl">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border shadow-sm">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</Label>
                                        <Badge variant={getStatusVariant(shipment.status)} className="font-black italic uppercase px-4">{shipment.status || 'Pending'}</Badge>
                                    </div>
                                    <Separator className="opacity-10" />
                                    <div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 block">Package Contents</Label>
                                        <p className="text-sm font-bold uppercase italic tracking-tight bg-background p-3 rounded-xl border">{shipment.contents || 'No description provided.'}</p>
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
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 block">Global Documentation Preview</Label>
                            <div className="aspect-[3/4] w-full rounded-2xl border-4 bg-white overflow-hidden shadow-2xl flex items-center justify-center relative">
                                {shipment.uploadedInvoiceUrl ? (
                                    shipment.uploadedInvoiceUrl.startsWith('data:application/pdf') ? (
                                        <iframe src={shipment.uploadedInvoiceUrl} className="w-full h-full border-none" />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shipment.uploadedInvoiceUrl} alt="Invoice" className="max-w-full h-full object-contain" />
                                    )
                                ) : (
                                    <div className="text-center p-8 space-y-4 opacity-10">
                                        <FileText className="h-24 w-24 mx-auto" />
                                        <p className="text-sm font-black uppercase italic tracking-tighter">Documentation Missing from System</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-6 border-t mt-4">
                    <DialogClose asChild><Button variant="outline" className="font-black uppercase h-12 px-10 tracking-widest text-[11px] border-2">Close Overview</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
