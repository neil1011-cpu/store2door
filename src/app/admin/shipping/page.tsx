
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

const getStatusVariant = (status: ShipmentStatus | string) => {
  switch (status) {
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

      if (!response.ok) {
        throw new Error(data?.message || `Server Error (${response.status})`);
      }

      const logicwareArray = Array.isArray(data) 
        ? data 
        : data.shipments || data.shippers || data.data || [];
      
      setLogicwareShipments(logicwareArray);
      
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error?.message || 'Connection to logistics hub failed.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingLogicware(false);
    }
  };

  useEffect(() => {
      fetchLogicwareData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinedShipments = useMemo(() => {
    const firebaseData = (firebaseShipments || []).map(s => ({ ...s, source: 'firebase' as const }));
    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    
    const mappedFirebase = firebaseData.map(shipment => ({
        ...shipment,
        user: usersMap.get(shipment.customerId),
        isLogicware: false
    }));

    const logicwareArray = Array.isArray(logicwareShipments)
      ? logicwareShipments
      : logicwareShipments?.data ||
        logicwareShipments?.shippers ||
        logicwareShipments?.shipments ||
        [];

    const mappedLogicware = logicwareArray.map((s: any) => ({
        id: `lw-${s.id}`,
        trackingNumber: s.trackingNumber || s.referenceCode || s.reference_code || 'NO-REF',
        internalBarcode: s.internalBarcode || s.internal_barcode || s.barcode || '',
        contents: s.contents || s.description || s.item_description || 'Global Package',
        description: s.contents || s.description || s.item_description || 'Global Package',
        status: s.status?.name || s.status_name || s.status || 'In Transit',
        
        merchant: s.merchant || s.seller || s.vendor || '',
        sourceMarketplace: s.sourceMarketplace || s.marketplace || s.source_marketplace || 'N/A',
        location: s.location || s.warehouse_location || '',

        weight: Number(s.weight || s.weight_lbs || 0),
        length: Number(s.length || s.len || 0),
        width: Number(s.width || s.wid || 0),
        height: Number(s.height || s.hei || 0),

        dimensionalWeight: Number(s.dimensionalWeight || s.dimWeight || s.volumetric_weight || 0),
        billableWeight: Number(s.billableWeight || s.billable_weight || 0),

        declaredValueUsd: Number(s.declaredValueUsd || s.declared_value || s.value_usd || 0),
        shippingCostUsd: Number(s.shippingCostUsd || s.freight_usd || 0),
        cost: Number(s.totalAmount || s.total_amount || s.cost || s.price || 0),

        customsExempt: !!(s.customsExempt || s.is_exempt),
        clearanceRate: Number(s.clearanceRate || s.duty_rate || 0),
        estimatedClearanceJmd: Number(s.estimatedClearanceJmd || s.duty_jmd || 0),
        exchangeRate: Number(s.exchangeRate || s.fx_rate || 156),

        invoiceUploaded: !!(s.invoiceUploaded || s.has_invoice || s.is_prealerted),
        invoiceUrl: s.invoiceUrl || s.invoice_url || '',
        
        fragile: !!(s.fragile || s.is_fragile),
        shipperId: s.shipperId || s.customer_id || null,
        shipperName: s.shipperName || s.customer_name || s.shipper?.name || 'Unknown Customer',
        
        manifestId: s.manifestId || s.flight_id || null,
        pickupBranch: s.pickupBranch || s.branch || null,

        timeline: s.timeline || [],
        notes: s.notes || [],

        createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),

        source: 'logicware' as const,
        isLogicware: true,
        customerId: s.shipperId || '',
        shippingDate: s.createdAt || s.created_at || new Date().toISOString(),
    }));

    console.log('[LOGICWARE RAW]', logicwareArray);

    if (logicwareArray.length > 0) {
        console.log(
            JSON.stringify(
                logicwareArray[0],
                null,
                2
            )
        );
    }

    const all = [...mappedFirebase, ...mappedLogicware];
    
    if (!isFetchingLogicware && logicwareShipments.length > 0) {
        console.log(
          '[FINAL DATA]',
          {
            logicwareArray,
            total: all.length,
          }
        );
        
        toast({
          title: 'Success',
          description: `Loaded ${all.length} worldwide records`,
        });
    }

    if (!searchTerm) return all;
    const lowerTerm = searchTerm.toLowerCase();
    return all.filter(s => 
        s.trackingNumber.toLowerCase().includes(lowerTerm) || 
        (s as any).user?.fullName?.toLowerCase().includes(lowerTerm) ||
        (s as any).shipperName?.toLowerCase().includes(lowerTerm) ||
        s.contents.toLowerCase().includes(lowerTerm)
    );
  }, [firebaseShipments, logicwareShipments, users, searchTerm, isFetchingLogicware, toast]);

  const handleOpenEmailDialog = (shipment: Shipment & { user?: Partial<UserProfile> }) => {
    setSelectedShipment(shipment);
    const customerName = shipment.user?.fullName || shipment.shipperName || 'Valued Customer';
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingNumber}`,
      body: `Dear ${customerName},\n\nHere's an update on your shipment ${shipment.trackingNumber}:\n\nThe current status is now: ${shipment.status}.\n\nYou can track your worldwide shipments anytime on our portal.\n\nThank you for choosing FromStore2Door!`,
    });
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedShipment) return;
    setIsSendingEmail(true);
    try {
      const emailTo = (selectedShipment as any).user?.email || (selectedShipment as any).email;
      if (!emailTo) throw new Error("Customer email missing.");

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailContent.subject,
          body: emailContent.body,
        }),
      });
      if (!response.ok) throw new Error('Failed to send email.');
      toast({ title: 'Email Sent', description: `Update for ${selectedShipment.trackingNumber} sent.` });
    } catch (error: any) {
      toast({ title: 'Error Sending Email', description: error.message, variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
      setIsEmailDialogOpen(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editableShipment || editableShipment.source !== 'firebase') return;
    setIsSaving(true);
    const shipmentDocRef = doc(firestore, 'users', editableShipment.customerId, 'shipments', editableShipment.id);
    const updateData = {
        ...editableShipment,
        updatedAt: serverTimestamp(),
    };
    delete (updateData as any).user;
    delete (updateData as any).isLogicware;
    delete (updateData as any).source;

    updateDoc(shipmentDocRef, updateData)
        .then(() => {
            toast({ title: 'Shipment Updated', description: `Shipment ${editableShipment.trackingNumber} updated.` });
            setIsEditDialogOpen(false);
            setEditableShipment(null);
        })
        .catch(error => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: shipmentDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => setIsSaving(false));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Loading Worldwide Manifests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worldwide Shipping Status</h1>
          <p className="text-muted-foreground">Detailed logistical tracking for global operations.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareData} variant="outline" disabled={isFetchingLogicware} className="border-primary/20 hover:bg-primary/5">
                {isFetchingLogicware ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync External Hub
            </Button>
            <Button onClick={() => setIsReceiveDialogOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg">
                <ScanLine className="mr-2 h-4 w-4" />
                Intake Shipment
            </Button>
            <Button variant="outline" asChild>
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-md overflow-hidden border-none">
        <CardHeader className="bg-muted/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle>Master Shipment List</CardTitle>
                <CardDescription>Deep data integration from Firebase and Logicware.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Tracking ID or Customer..." className="pl-9 border-2 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="pl-6">Source</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {combinedShipments.map((shipment) => (
                    <TableRow key={shipment.id} className={cn("hover:bg-muted/30 transition-colors", shipment.isLogicware && "bg-blue-50/30 dark:bg-blue-950/10")}>
                    <TableCell className="pl-6">
                        {shipment.isLogicware ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">Logicware Hub</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200">Local OS</Badge>
                        )}
                    </TableCell>
                    <TableCell className="font-mono font-black text-primary uppercase">
                        <div className="flex flex-col">
                            <span>{shipment.trackingNumber}</span>
                            {shipment.internalBarcode && <span className="text-[9px] text-muted-foreground font-mono">{shipment.internalBarcode}</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="font-bold">{(shipment as any).user?.fullName || shipment.shipperName || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{shipment.shipperId || (shipment as any).user?.mailboxNumber}</div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{shipment.contents}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold flex items-center gap-1 w-fit">
                            <Store className="h-2 w-2" />
                            {shipment.sourceMarketplace || 'N/A'}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <Weight className="h-3 w-3 text-muted-foreground" />
                                {shipment.weight || 0} lbs
                            </div>
                            {shipment.dimensionalWeight && shipment.dimensionalWeight > 0 && (
                                <span className="text-[9px] text-orange-600 font-bold">DIM: {shipment.dimensionalWeight} lbs</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell><Badge variant={getStatusVariant(shipment.status)} className="px-3">{shipment.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-2 pr-6">
                        <Button variant="ghost" size="icon" onClick={() => setViewingShipment(shipment)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => { setEditableShipment({ ...shipment }); setIsEditDialogOpen(true); }} disabled={shipment.isLogicware}>
                            <Edit className="mr-2 h-3.5 w-3.5" />Update
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8 font-bold" onClick={() => handleOpenEmailDialog(shipment as any)} disabled={!((shipment as any).user || (shipment as any).email)}>
                        <Mail className="mr-2 h-3.5 w-3.5" />Notify
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {combinedShipments.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground italic">No worldwide records matching your search.</TableCell></TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ShipmentDetailsDialog shipment={viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)} />

      <ReceivePackageDialog 
        open={isReceiveDialogOpen} 
        onOpenChange={setIsReceiveDialogOpen} 
        users={users || []} 
      />

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Send Customer Notification</DialogTitle>
            <DialogDescription>Review and send a manual status update email.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right font-bold uppercase text-[10px]">Subject</Label>
              <Input id="subject" value={emailContent.subject} onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })} className="col-span-3 h-11" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="body" className="text-right font-bold uppercase text-[10px]">Body</Label>
              <Textarea id="body" value={emailContent.body} onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })} className="col-span-3 min-h-[220px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail} className="h-11 px-8">
                {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase italic tracking-tighter">Update Shipment #{editableShipment?.trackingNumber}</DialogTitle>
          </DialogHeader>
          {editableShipment && (
            <ScrollArea className="max-h-[70vh] px-1">
                <div className="grid gap-6 py-4 px-2">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Item Description</Label>
                            <Input value={editableShipment.contents} onChange={(e) => setEditableShipment({ ...editableShipment, contents: e.target.value })} className="h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Internal Barcode</Label>
                            <Input value={editableShipment.internalBarcode || ''} onChange={(e) => setEditableShipment({ ...editableShipment, internalBarcode: e.target.value })} className="h-11 font-mono" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Current Stage</Label>
                            <Select value={editableShipment.status} onValueChange={(value) => setEditableShipment({ ...editableShipment, status: value as ShipmentStatus })}>
                                <SelectTrigger className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Received at Warehouse (FL)">Received (Warehouse)</SelectItem>
                                    <SelectItem value="Processed">Processed</SelectItem>
                                    <SelectItem value="Being Shipped">Being Shipped</SelectItem>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                    <SelectItem value="Arrived in Jamaica">Arrived in Jamaica</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Marketplace Source</Label>
                            <Input value={editableShipment.sourceMarketplace || ''} onChange={(e) => setEditableShipment({ ...editableShipment, sourceMarketplace: e.target.value })} className="h-11" placeholder="e.g., Amazon, eBay" />
                        </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                        <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-primary" /> Dimensions & Weights
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold opacity-60">Weight (lbs)</Label>
                                <Input type="number" value={editableShipment.weight || 0} onChange={(e) => setEditableShipment({...editableShipment, weight: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold opacity-60">L (in)</Label>
                                <Input type="number" value={editableShipment.length || 0} onChange={(e) => setEditableShipment({...editableShipment, length: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold opacity-60">W (in)</Label>
                                <Input type="number" value={editableShipment.width || 0} onChange={(e) => setEditableShipment({...editableShipment, width: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold opacity-60">H (in)</Label>
                                <Input type="number" value={editableShipment.height || 0} onChange={(e) => setEditableShipment({...editableShipment, height: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Declared Value (USD)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                                <Input type="number" value={editableShipment.declaredValueUsd || 0} onChange={(e) => setEditableShipment({...editableShipment, declaredValueUsd: Number(e.target.value)})} className="pl-9 h-11" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Total Cost (JMD)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs opacity-40">JMD $</span>
                                <Input type="number" value={editableShipment.cost || 0} onChange={(e) => setEditableShipment({...editableShipment, cost: Number(e.target.value)})} className="pl-16 h-11 font-black" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Checkbox id="fragile" checked={editableShipment.fragile} onCheckedChange={(v) => setEditableShipment({...editableShipment, fragile: !!v})} />
                        <label htmlFor="fragile" className="text-sm font-bold uppercase cursor-pointer">Mark as Fragile</label>
                    </div>
                </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving} className="h-11 px-8 font-black uppercase tracking-tight">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Update Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShipmentDetailsDialog({ shipment, onOpenChange }: { shipment: Shipment | null, onOpenChange: (open: boolean) => void }) {
    if (!shipment) return null;

    const DetailItem = ({ label, value, icon }: { label: string, value: any, icon?: any }) => (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                {icon} {label}
            </p>
            <p className="font-bold text-sm">{value || 'N/A'}</p>
        </div>
    );

    return (
        <Dialog open={!!shipment} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-primary text-primary-foreground">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge variant="outline" className="mb-2 text-white border-white/20 uppercase text-[9px] tracking-widest">
                                {shipment.isLogicware ? 'Logicware Global Hub' : 'Local Firebase Network'}
                            </Badge>
                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">
                                {shipment.trackingNumber}
                            </DialogTitle>
                            <DialogDescription className="text-primary-foreground/70 font-bold text-[10px] uppercase tracking-widest mt-1">
                                {shipment.internalBarcode ? `Internal Barcode: ${shipment.internalBarcode}` : 'No Internal Barcode Assigned'}
                            </DialogDescription>
                        </div>
                        <div className="text-right">
                            <Badge className="bg-white text-primary text-lg px-4 py-1 font-black italic">
                                {shipment.status}
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="p-8 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                             <DetailItem label="Description" value={shipment.contents} icon={<Package className="h-2 w-2" />} />
                             <DetailItem label="Merchant" value={shipment.merchant} icon={<Store className="h-2 w-2" />} />
                             <DetailItem label="Marketplace" value={shipment.sourceMarketplace} icon={<ShoppingCart className="h-2 w-2" />} />
                             <DetailItem label="Warehouse Location" value={shipment.location} icon={<MapPin className="h-2 w-2" />} />
                        </div>

                        <Separator />

                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-primary" /> Physical Specifications
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 bg-muted/20 p-6 rounded-2xl">
                                <DetailItem label="Actual Weight" value={`${shipment.weight} lbs`} />
                                <DetailItem label="Length" value={`${shipment.length} in`} />
                                <DetailItem label="Width" value={`${shipment.width} in`} />
                                <DetailItem label="Height" value={`${shipment.height} in`} />
                                <DetailItem label="Dimensional" value={`${shipment.dimensionalWeight} lbs`} />
                                <DetailItem label="Billable" value={`${shipment.billableWeight} lbs`} />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" /> Financials & Customs
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="p-4 border rounded-xl space-y-3">
                                    <DetailItem label="Declared Value" value={`$${shipment.declaredValueUsd} USD`} />
                                    <DetailItem label="Shipping (Freight)" value={`$${shipment.shippingCostUsd} USD`} />
                                </div>
                                <div className="p-4 border rounded-xl space-y-3">
                                    <DetailItem label="Clearance Rate" value={`${shipment.clearanceRate}%`} />
                                    <DetailItem label="Estimated Clearance" value={`JMD $${shipment.estimatedClearanceJmd}`} />
                                </div>
                                <div className="p-4 border rounded-xl space-y-3 bg-primary/5 border-primary/20">
                                    <DetailItem label="Grand Total (JMD)" value={`$${shipment.cost?.toLocaleString()}`} />
                                    <DetailItem label="Exchange Rate" value={`1 USD = ${shipment.exchangeRate} JMD`} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase opacity-60">Customs Exempt</span>
                                        <Badge variant={shipment.customsExempt ? 'default' : 'secondary'}>{shipment.customsExempt ? 'YES' : 'NO'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase opacity-60">Invoice Status</span>
                                        <Badge variant={shipment.invoiceUploaded ? 'default' : 'destructive'}>{shipment.invoiceUploaded ? 'UPLOADED' : 'MISSING'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase opacity-60">Fragile Cargo</span>
                                        <Badge variant={shipment.fragile ? 'destructive' : 'secondary'}>{shipment.fragile ? 'YES' : 'NO'}</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             <DetailItem label="Manifest/Flight ID" value={shipment.manifestId} icon={<Plane className="h-2 w-2" />} />
                             <DetailItem label="Pickup Branch" value={shipment.pickupBranch} icon={<MapPin className="h-2 w-2" />} />
                             <DetailItem label="External Tracking" value={shipment.trackingNumber} icon={<Search className="h-2 w-2" />} />
                        </div>

                        {shipment.timeline && shipment.timeline.length > 0 && (
                             <div>
                                <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <History className="h-4 w-4 text-primary" /> Movement History
                                </h4>
                                <div className="space-y-4">
                                    {shipment.timeline.map((event, i) => (
                                        <div key={i} className="flex gap-4 items-center p-3 border-l-4 border-l-primary bg-muted/10 rounded-r-lg">
                                            <div className="text-xs font-black italic uppercase min-w-[100px]">{event.type}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(event.date).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 bg-muted/30 border-t flex justify-between items-center">
                    <div className="text-[10px] font-bold uppercase opacity-40">System Record ID: {shipment.id}</div>
                    <Button onClick={() => onOpenChange(false)}>Close Overview</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ReceivePackageDialog({ open, onOpenChange, users }: { open: boolean, onOpenChange: (open: boolean) => void, users: UserProfile[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [contents, setContents] = useState('');
    const [weight, setWeight] = useState('');
    const [marketplace, setMarketplace] = useState('');
    const [status, setStatus] = useState<ShipmentStatus>('Received at Warehouse (FL)');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [foundPreAlert, setFoundPreAlert] = useState<any | null>(null);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 200);
            return () => clearTimeout(timer);
        } else {
            setTrackingNumber('');
            setCustomerId('');
            setContents('');
            setWeight('');
            setMarketplace('');
            setFoundPreAlert(null);
        }
    }, [open]);

    useEffect(() => {
        const searchPreAlert = async () => {
            if (trackingNumber.length < 5) return;
            try {
              const q = query(collectionGroup(firestore, 'pre_alerts'), where('trackingNumber', '==', trackingNumber.toUpperCase()));
              const snap = await getDocs(q);
              if (!snap.empty) {
                  const alert = snap.docs[0].data();
                  setFoundPreAlert({ ...alert, id: snap.docs[0].id });
                  setCustomerId(alert.customerId);
                  setContents(alert.contents);
                  toast({ title: "Pre-Alert Matched", description: `Found record for ${alert.customerName}` });
              }
            } catch (e) {}
        };
        const timer = setTimeout(searchPreAlert, 500);
        return () => clearTimeout(timer);
    }, [trackingNumber, firestore, toast]);

    const handleReceive = async () => {
        if (!trackingNumber || !customerId || !contents) {
            toast({ title: "Missing Fields", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        
        const shipmentData: any = {
            trackingNumber: trackingNumber.toUpperCase(),
            customerId,
            contents,
            weight: parseFloat(weight) || 0,
            sourceMarketplace: marketplace,
            status,
            shippingDate: serverTimestamp(),
            paymentStatus: 'Unpaid' as const,
            invoiceUrl: '', invoiceId: '', cost: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeline: [{ type: 'In-Take', date: new Date().toISOString() }]
        };
        
        const shipmentRef = doc(collection(firestore, 'users', customerId, 'shipments'));
        batch.set(shipmentRef, shipmentData);
        
        if (foundPreAlert) {
            batch.update(doc(firestore, 'users', customerId, 'pre_alerts', foundPreAlert.id), { status: 'Processed' });
        }
        
        try {
            await batch.commit();
            toast({ title: 'Shipment Recorded!', description: `Package intake complete for ${users.find(u=>u.id===customerId)?.fullName}` });
            onOpenChange(false);
        } catch (e) {
            toast({ title: 'Permission Denied', description: "Check administrator session privileges.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black italic uppercase tracking-tighter">
                        <ScanLine className="h-6 w-6 text-primary" /> Master Intake
                    </DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Worldwide Logistics Center</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <Label className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold uppercase tracking-widest">Tracking Number</span>
                            <span className="text-[9px] text-primary animate-pulse font-black uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded border border-primary/20">● Ready for Scanner</span>
                        </Label>
                        <Input 
                            ref={inputRef} 
                            placeholder="SCAN BARCODE OR TYPE..." 
                            value={trackingNumber} 
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="text-xl h-14 font-mono font-black border-4 focus-visible:ring-0 focus:border-primary transition-all uppercase placeholder:opacity-20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase opacity-60">Customer Profile</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select Account" /></SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id} className="font-bold">
                                            {u.fullName} <span className="opacity-40 text-[10px]">({u.mailboxNumber})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase opacity-60">Initial Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Received at Warehouse (FL)" className="font-bold">Received (Warehouse)</SelectItem>
                                    <SelectItem value="In Transit" className="font-bold">In Transit (Global)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase opacity-60">Marketplace</Label>
                            <Input placeholder="e.g., Amazon, Shein" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase opacity-60">Weight (lbs)</Label>
                            <Input type="number" placeholder="0.0" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 border-2" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase opacity-60">Item Description</Label>
                        <Input placeholder="e.g., Electronics, Fashion, Medical..." value={contents} onChange={(e) => setContents(e.target.value)} className="h-11 border-2" />
                    </div>
                    {foundPreAlert && (
                        <div className="p-4 bg-primary text-primary-foreground rounded-xl flex gap-4 items-center animate-in slide-in-from-bottom-2">
                            <CheckCircle2 className="h-6 w-6 shrink-0" />
                            <div className="text-sm">
                                <p className="font-black uppercase italic leading-none">Pre-Alert Found</p>
                                <p className="opacity-80 text-[10px] font-bold tracking-widest mt-1">LINKED TO {foundPreAlert.customerName.toUpperCase()}</p>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="pt-4 border-t border-dashed">
                    <Button onClick={handleReceive} disabled={isSubmitting} className="w-full h-14 font-black uppercase text-lg shadow-xl tracking-tighter italic">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Package Intake"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
