'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2, Search, PlusCircle, ScanLine, CheckCircle2, AlertCircle, Zap, RefreshCw, ShoppingCart, Weight, DollarSign, Store, Eye, Info, Package, Plane, MapPin, Ruler, ShieldAlert, History } from 'lucide-react';
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
              <Input placeholder="Search..." className="max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
                <TableHeader><TableRow><TableHead className="pl-6">Source</TableHead><TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {combinedShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                    <TableCell className="pl-6"><Badge variant="outline">{shipment.isLogicware ? 'Hub' : 'Local'}</Badge></TableCell>
                    <TableCell className="font-mono font-bold uppercase">{shipment.trackingNumber}</TableCell>
                    <TableCell>{(shipment as any).user?.fullName || shipment.shipperName || 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(shipment.status)}>{shipment.status || 'Pending'}</Badge></TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" onClick={() => setViewingShipment(shipment)}>View</Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      <ShipmentDetailsDialog shipment={viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)} />
    </div>
  );
}

function ShipmentDetailsDialog({ shipment, onOpenChange }: { shipment: Shipment | null, onOpenChange: (open: boolean) => void }) {
    if (!shipment) return null;
    return (
        <Dialog open={!!shipment} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{shipment.trackingNumber}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div><Label className="text-xs font-bold uppercase opacity-60">Status</Label><p className="font-bold">{shipment.status || 'Pending'}</p></div>
                    <div><Label className="text-xs font-bold uppercase opacity-60">Contents</Label><p>{shipment.contents}</p></div>
                    <div><Label className="text-xs font-bold uppercase opacity-60">Weight</Label><p>{shipment.weight} lbs</p></div>
                </div>
            </DialogContent>
        </Dialog>
    );
}