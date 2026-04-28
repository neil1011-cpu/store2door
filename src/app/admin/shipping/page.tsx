
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2, Search, PlusCircle, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import type { Shipment, UserProfile, ShipmentStatus, PreAlert } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, doc, updateDoc, serverTimestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const getStatusVariant = (status: ShipmentStatus) => {
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

  const firestore = useFirestore();
  const { user: adminUser } = useUser();

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'shipments'));
  }, [firestore]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const loading = isLoadingShipments || isLoadingUsers;

  const shipmentsWithUsers = useMemo(() => {
    if (!shipments || !users) return [];
    const usersMap = new Map(users.map(u => [u.id, u]));
    const mapped = shipments.map(shipment => ({
        ...shipment,
        user: usersMap.get(shipment.customerId)
    }));
    if (!searchTerm) return mapped;
    const lowerTerm = searchTerm.toLowerCase();
    return mapped.filter(s => 
        s.trackingNumber.toLowerCase().includes(lowerTerm) || 
        s.user?.fullName?.toLowerCase().includes(lowerTerm) ||
        s.contents.toLowerCase().includes(lowerTerm)
    );
  }, [shipments, users, searchTerm]);

  const handleOpenEmailDialog = (shipment: Shipment & { user?: Partial<UserProfile> }) => {
    setSelectedShipment(shipment);
    const customerName = shipment.user?.fullName || 'Valued Customer';
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingNumber}`,
      body: `Dear ${customerName},\n\nHere's an update on your shipment ${shipment.trackingNumber}:\n\nThe current status is: ${shipment.status}.\n\nThank you for shipping with us!\nFromStore2Door`,
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
          <h1 className="text-3xl font-bold tracking-tight">Shipping Status</h1>
          <p className="text-muted-foreground">Track all current shipments and update their status.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setIsReceiveDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Receive Package
            </Button>
            <Button variant="outline" asChild>
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle>All Shipments</CardTitle>
                <CardDescription>An overview of all packages currently in the system.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tracking, user..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentsWithUsers.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono font-bold">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{shipment.user?.fullName || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">{shipment.user?.email}</div>
                  </TableCell>
                  <TableCell><Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge></TableCell>
                  <TableCell>{shipment.contents}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditableShipment({ ...shipment }); setIsEditDialogOpen(true); }}>
                      <Edit className="mr-2 h-4 w-4" />Update
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailDialog(shipment)} disabled={!shipment.user}>
                      <Mail className="mr-2 h-4 w-4" />Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {shipmentsWithUsers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No shipments found.</TableCell></TableRow>
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
            <DialogTitle>Customize Email</DialogTitle>
            <DialogDescription>Edit the email content before sending it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">Subject</Label>
              <Input id="subject" value={emailContent.subject} onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="body" className="text-right">Body</Label>
              <Textarea id="body" value={emailContent.body} onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })} className="col-span-3 min-h-[200px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>{isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Shipment #{editableShipment?.trackingNumber}</DialogTitle>
          </DialogHeader>
          {editableShipment && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contents">Contents</Label>
                <Input id="edit-contents" value={editableShipment.contents} onChange={(e) => setEditableShipment({ ...editableShipment, contents: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editableShipment.status} onValueChange={(value) => setEditableShipment({ ...editableShipment, status: value as ShipmentStatus })}>
                    <SelectTrigger id="edit-status"><SelectValue placeholder="Select status" /></SelectTrigger>
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
                  <Label htmlFor="edit-payment-status">Payment Status</Label>
                  <Select value={editableShipment.paymentStatus} onValueChange={(value) => setEditableShipment({ ...editableShipment, paymentStatus: value as 'Paid' | 'Unpaid' })}>
                    <SelectTrigger id="edit-payment-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Cost (JMD $)</Label>
                <Input id="edit-cost" type="number" value={editableShipment.cost} onChange={(e) => setEditableShipment({ ...editableShipment, cost: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Package</Button>
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

    // Auto-focus when open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 150);
        } else {
            setTrackingNumber('');
            setCustomerId('');
            setContents('');
            setFoundPreAlert(null);
        }
    }, [open]);

    // Auto-search for Pre-Alerts
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
              }
            } catch (e) {}
        };
        const timer = setTimeout(searchPreAlert, 400);
        return () => clearTimeout(timer);
    }, [trackingNumber, firestore]);

    const handleReceive = async () => {
        if (!trackingNumber || !customerId || !contents) return;
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
        const sRef = doc(collection(firestore, 'users', customerId, 'shipments'));
        batch.set(sRef, shipmentData);
        if (foundPreAlert) {
            batch.update(doc(firestore, 'users', customerId, 'pre_alerts', foundPreAlert.id), { status: 'Processed' });
        }
        try {
            await batch.commit();
            toast({ title: 'Package Received!', description: `Shipment recorded for ${users.find(u=>u.id===customerId)?.fullName}` });
            onOpenChange(false);
        } catch (e) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ScanLine className="h-5 w-5 text-primary" /> Intake Shipment
                    </DialogTitle>
                    <DialogDescription>Scan a barcode or enter tracking details manually.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="flex justify-between">
                            <span>Tracking Number</span>
                            <span className="text-[10px] text-primary animate-pulse font-bold uppercase tracking-tighter">● Ready for Barcode Scan</span>
                        </Label>
                        <Input 
                            ref={inputRef} 
                            placeholder="JMXXXXXXXXX" 
                            value={trackingNumber} 
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="text-lg font-mono border-2 focus:border-primary"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.mailboxNumber})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Received at Warehouse (FL)">Received at Warehouse (FL)</SelectItem>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Contents</Label>
                        <Input placeholder="e.g., Nike Shoes" value={contents} onChange={(e) => setContents(e.target.value)} />
                    </div>
                    {foundPreAlert && (
                        <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex gap-3 items-center text-sm text-green-800 font-medium">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Pre-Alert matched for {foundPreAlert.customerName}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleReceive} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Intake"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
