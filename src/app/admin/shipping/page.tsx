
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
import { collection, collectionGroup, query, doc, updateDoc, serverTimestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

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
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<(Shipment & { user?: Partial<UserProfile> }) | null>(null);
  const [editableShipment, setEditableShipment] = useState<Shipment | null>(null);
  const [viewingShipment, setViewingShipment] = useState<Shipment | null>(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLogicware, setIsFetchingLogicware] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [logicwareShipments, setLogicwareShipments] = useState<any[]>([]);

  const firestore = useFirestore();

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'shipments'));
  }, [firestore]);
  const { data: firebaseShipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
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

    const all = [...mappedFirebase, ...mappedLogicware];

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
      toast({ title: 'Sync Failed', description: error?.message || 'Connection error', variant: 'destructive' });
    } finally {
      setIsFetchingLogicware(false);
    }
  };

  useEffect(() => {
      fetchLogicwareData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveChanges = async () => {
    if (!editableShipment || editableShipment.source !== 'firebase') return;
    setIsSaving(true);
    const shipmentDocRef = doc(firestore, 'users', editableShipment.customerId, 'shipments', editableShipment.id);
    const updateData = { ...editableShipment, updatedAt: serverTimestamp() };
    delete (updateData as any).user; delete (updateData as any).isLogicware; delete (updateData as any).source;

    updateDoc(shipmentDocRef, updateData)
        .then(() => {
            toast({ title: 'Shipment Updated' });
            setIsEditDialogOpen(false);
            setEditableShipment(null);
        })
        .finally(() => setIsSaving(false));
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Worldwide Shipping Status</h1>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareData} variant="outline" disabled={isFetchingLogicware}><RefreshCw className={cn("mr-2 h-4 w-4", isFetchingLogicware && "animate-spin")} />Sync Hub</Button>
            <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        </div>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10">
          <div className="flex justify-between items-center gap-4">
              <CardTitle>Shipment Ledger</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search worldwide tracking..." className="pl-9 h-11 border-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-6">Source</TableHead>
                        <TableHead>Tracking ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {combinedShipments.map((shipment) => (
                    <TableRow key={shipment.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                        <Badge variant="outline" className={cn(shipment.isLogicware ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200")}>
                            {shipment.isLogicware ? 'Hub' : 'Local'}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-black text-primary uppercase text-sm tracking-tighter">{shipment.trackingNumber}</TableCell>
                    <TableCell className="font-medium text-xs">{(shipment as any).user?.fullName || shipment.shipperName || 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(shipment.status)} className="px-3">{shipment.status || 'Pending'}</Badge></TableCell>
                    <TableCell>
                        {shipment.uploadedInvoiceUrl ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[10px] cursor-help flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Ready
                            </Badge>
                        ) : (
                            <span className="text-[10px] text-muted-foreground italic">None</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" onClick={() => setViewingShipment(shipment as Shipment)} className="h-8 font-bold border-2">
                            <Eye className="h-4 w-4 mr-2" /> View
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {combinedShipments.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center h-48 text-muted-foreground italic">No shipments found in current sync.</TableCell></TableRow>
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <Package className="h-6 w-6" />
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Shipment: {shipment.trackingNumber}</DialogTitle>
                    </div>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Global Logistics Detailed View</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        <div className="space-y-6">
                            <Card className="bg-muted/30 border-none shadow-inner">
                                <CardContent className="pt-6 space-y-4">
                                    <div><Label className="text-[10px] font-bold uppercase opacity-60">Status</Label><p className="font-black text-lg text-primary">{shipment.status || 'Pending'}</p></div>
                                    <Separator />
                                    <div><Label className="text-[10px] font-bold uppercase opacity-60">Package Contents</Label><p className="text-sm font-medium">{shipment.contents || 'No description provided.'}</p></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label className="text-[10px] font-bold uppercase opacity-60">Weight</Label><p className="font-bold">{shipment.weight || 0} lbs</p></div>
                                        <div><Label className="text-[10px] font-bold uppercase opacity-60">Total Cost</Label><p className="font-black text-green-600">JMD ${shipment.cost?.toFixed(2) || '0.00'}</p></div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Supporting Documents
                                </h4>
                                {shipment.uploadedInvoiceUrl ? (
                                    <div className="p-4 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-orange-600" /></div>
                                            <div>
                                                <p className="text-sm font-bold uppercase">Commercial Invoice</p>
                                                <p className="text-[10px] font-medium text-orange-600/70">Provided by User</p>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={handleDownloadReceipt} className="font-bold uppercase tracking-tighter">
                                            <Download className="h-4 w-4 mr-2" /> Get File
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center opacity-30">
                                        <ShieldAlert className="h-8 w-8 mb-2" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No Document Provided</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Commercial Invoice Preview</Label>
                            <div className="aspect-[3/4] w-full rounded-xl border-2 bg-white overflow-hidden shadow-2xl flex items-center justify-center relative">
                                {shipment.uploadedInvoiceUrl ? (
                                    shipment.uploadedInvoiceUrl.startsWith('data:application/pdf') ? (
                                        <iframe src={shipment.uploadedInvoiceUrl} className="w-full h-full border-none" />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shipment.uploadedInvoiceUrl} alt="Invoice" className="max-w-full h-full object-contain" />
                                    )
                                ) : (
                                    <div className="text-center p-8 space-y-2 opacity-20">
                                        <FileText className="h-16 w-16 mx-auto" />
                                        <p className="text-xs font-black uppercase italic">Document Missing</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-6 border-t mt-4">
                    <DialogClose asChild><Button variant="outline" className="font-bold uppercase h-11 px-8">Close Overview</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
