
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2, Search, PlusCircle, ScanLine, CheckCircle2, AlertCircle, Zap, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import type { Shipment, UserProfile, ShipmentStatus, PreAlert } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [logicwareShipments, setLogicwareShipments] = useState<any[]>([]);
  const [isFetchingLogicware, setIsFetchingLogicware] = useState(false);

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
      setIsFetchingLogicware(true);
      try {
          const res = await fetch('/api/admin/logicware-shipments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}) // API key pulled from firestore server-side
          });
          const data = await res.json();
          if (data.success) {
              setLogicwareShipments(data.shipments);
              toast({ title: "Logicware Synced", description: `Found ${data.shipments.length} external packages.` });
          } else {
              toast({ title: "Sync Notice", description: data.message, variant: 'default' });
          }
      } catch (e) {
          toast({ title: "Sync Failed", variant: "destructive" });
      } finally {
          setIsFetchingLogicware(false);
      }
  };

  // Auto-sync logicware on mount
  useEffect(() => {
      fetchLogicwareData();
  }, []);

  const combinedShipments = useMemo(() => {
    const firebaseData = firebaseShipments || [];
    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    
    const mappedFirebase = firebaseData.map(shipment => ({
        ...shipment,
        user: usersMap.get(shipment.customerId),
        isLogicware: false
    }));

    // Merge logicware with firebase, ensuring no duplicates by tracking number
    const firebaseTrackingNumbers = new Set(mappedFirebase.map(s => s.trackingNumber.toUpperCase()));
    const uniqueLogicware = logicwareShipments.filter(s => !firebaseTrackingNumbers.has(s.trackingNumber.toUpperCase()));

    const all = [...mappedFirebase, ...uniqueLogicware];
    
    if (!searchTerm) return all;
    const lowerTerm = searchTerm.toLowerCase();
    return all.filter(s => 
        s.trackingNumber.toLowerCase().includes(lowerTerm) || 
        (s as any).user?.fullName?.toLowerCase().includes(lowerTerm) ||
        (s as any).customerName?.toLowerCase().includes(lowerTerm) ||
        s.contents.toLowerCase().includes(lowerTerm)
    );
  }, [firebaseShipments, logicwareShipments, users, searchTerm]);

  const handleOpenEmailDialog = (shipment: Shipment & { user?: Partial<UserProfile> }) => {
    setSelectedShipment(shipment);
    const customerName = shipment.user?.fullName || 'Valued Customer';
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingNumber}`,
      body: `Dear ${customerName},\n\nHere's an update on your shipment ${shipment.trackingNumber}:\n\nThe current status is now: ${shipment.status}.\n\nYou can track your worldwide shipments anytime on our portal.\n\nThank you for choosing FromStore2Door!`,
    });
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedShipment || !selectedShipment.user) return;
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedShipment.user.email,
          subject: emailContent.subject,
          body: emailContent.body,
        }),
      });
      if (!response.ok) throw new Error('Failed to send email.');
      toast({ title: 'Email Sent', description: `Update for ${selectedShipment.trackingNumber} sent.` });
    } catch (error) {
      toast({ title: 'Error Sending Email', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
      setIsEmailDialogOpen(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editableShipment) return;
    setIsSaving(true);
    const shipmentDocRef = doc(firestore, 'users', editableShipment.customerId, 'shipments', editableShipment.id);
    const updateData = {
        contents: editableShipment.contents,
        status: editableShipment.status,
        paymentStatus: editableShipment.paymentStatus,
        cost: editableShipment.cost
    };
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worldwide Shipping Status</h1>
          <p className="text-muted-foreground">Monitor and update status for packages from anywhere in the world.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareData} variant="outline" disabled={isFetchingLogicware} className="border-primary/20 hover:bg-primary/5">
                {isFetchingLogicware ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
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

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle>Master Shipment List</CardTitle>
                <CardDescription>Consolidated view of Firebase and Logicware packages.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Tracking ID or Customer..." className="pl-9 border-2 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                <TableHead>Contents</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedShipments.map((shipment) => (
                <TableRow key={shipment.id} className={cn("hover:bg-muted/30 transition-colors", (shipment as any).isLogicware && "bg-blue-50/30 dark:bg-blue-950/10")}>
                  <TableCell className="pl-6">
                      {(shipment as any).isLogicware ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">Logicware</Badge>
                      ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200">Firebase</Badge>
                      )}
                  </TableCell>
                  <TableCell className="font-mono font-black text-primary uppercase">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <div className="font-bold">{(shipment as any).user?.fullName || (shipment as any).customerName || 'N/A'}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{(shipment as any).user?.mailboxNumber || shipment.customerId}</div>
                  </TableCell>
                  <TableCell><Badge variant={getStatusVariant(shipment.status)} className="px-3">{shipment.status}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{shipment.contents}</TableCell>
                  <TableCell className="text-right space-x-2 pr-6">
                    <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => { setEditableShipment({ ...shipment }); setIsEditDialogOpen(true); }} disabled={(shipment as any).isLogicware}>
                      <Edit className="mr-2 h-3.5 w-3.5" />Update
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 font-bold" onClick={() => handleOpenEmailDialog(shipment)} disabled={!(shipment as any).user}>
                      <Mail className="mr-2 h-3.5 w-3.5" />Notify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {combinedShipments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground italic">No worldwide shipments matching your search.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="uppercase italic tracking-tighter">Update Shipment #{editableShipment?.trackingNumber}</DialogTitle>
          </DialogHeader>
          {editableShipment && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contents" className="text-[10px] font-bold uppercase text-muted-foreground">Item Description</Label>
                <Input id="edit-contents" value={editableShipment.contents} onChange={(e) => setEditableShipment({ ...editableShipment, contents: e.target.value })} className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="text-[10px] font-bold uppercase text-muted-foreground">Current Stage</Label>
                  <Select value={editableShipment.status} onValueChange={(value) => setEditableShipment({ ...editableShipment, status: value as ShipmentStatus })}>
                    <SelectTrigger id="edit-status" className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Received at Warehouse (FL)">Received at Warehouse (FL)</SelectItem>
                      <SelectItem value="Processed">Processed</SelectItem>
                      <SelectItem value="Being Shipped">Being Shipped</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Arrived in Jamaica">Arrived in Jamaica</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-payment-status" className="text-[10px] font-bold uppercase text-muted-foreground">Finance Status</Label>
                  <Select value={editableShipment.paymentStatus} onValueChange={(value) => setEditableShipment({ ...editableShipment, paymentStatus: value as 'Paid' | 'Unpaid' })}>
                    <SelectTrigger id="edit-payment-status" className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost" className="text-[10px] font-bold uppercase text-muted-foreground">Total Cost (JMD $)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">JMD $</span>
                    <Input id="edit-cost" type="number" value={editableShipment.cost} onChange={(e) => setEditableShipment({ ...editableShipment, cost: Number(e.target.value) })} className="pl-16 h-11 font-black text-lg" />
                </div>
              </div>
            </div>
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

function ReceivePackageDialog({ open, onOpenChange, users }: { open: boolean, onOpenChange: (open: boolean) => void, users: UserProfile[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [contents, setContents] = useState('');
    const [status, setStatus] = useState<ShipmentStatus>('Received at Warehouse (FL)');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [foundPreAlert, setFoundPreAlert] = useState<PreAlert | null>(null);

    // Auto-focus logic for Barcode Scanners
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
            setFoundPreAlert(null);
        }
    }, [open]);

    // Auto-match for Pre-Alerts during entry
    useEffect(() => {
        const searchPreAlert = async () => {
            if (trackingNumber.length < 5) return;
            try {
              const q = query(collectionGroup(firestore, 'pre_alerts'), where('trackingNumber', '==', trackingNumber.toUpperCase()));
              const snap = await getDocs(q);
              if (!snap.empty) {
                  const alert = snap.docs[0].data() as PreAlert;
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
        
        const shipmentData = {
            trackingNumber: trackingNumber.toUpperCase(),
            customerId,
            contents,
            status,
            shippingDate: serverTimestamp(),
            paymentStatus: 'Unpaid' as const,
            invoiceUrl: '', invoiceId: '', cost: 0,
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
                <div className="space-y-8 py-6">
                    <div className="space-y-3">
                        <Label className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold uppercase tracking-widest">Tracking Number</span>
                            <span className="text-[9px] text-primary animate-pulse font-black uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded border border-primary/20">● Ready for Scanner</span>
                        </Label>
                        <Input 
                            ref={inputRef} 
                            placeholder="SCAN BARCODE OR TYPE..." 
                            value={trackingNumber} 
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="text-2xl h-16 font-mono font-black border-4 focus-visible:ring-0 focus:border-primary transition-all uppercase placeholder:opacity-20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase opacity-60">Customer Profile</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Select Account" /></SelectTrigger>
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
                                <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Received at Warehouse (FL)" className="font-bold">Received (Warehouse)</SelectItem>
                                    <SelectItem value="In Transit" className="font-bold">In Transit (Global)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase opacity-60">Item Details</Label>
                        <Input placeholder="e.g., Electronics, Fashion, Medical..." value={contents} onChange={(e) => setContents(e.target.value)} className="h-12 border-2" />
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
