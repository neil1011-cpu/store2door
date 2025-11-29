
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import type { Shipment, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc } from 'firebase/firestore';


const getStatusVariant = (status: string) => {
    switch (status) {
        case 'In Transit':
            return 'default';
        case 'Customs':
            return 'secondary';
        case 'Delivered':
            return 'outline';
        case 'Pending':
        case 'Pre-Alert':
            return 'destructive';
        case 'Processed':
             return 'secondary';
        default:
            return 'default';
    }
}

export default function ShippingPage() {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment & { user?: UserProfile } | null>(null);
  const [editableShipment, setEditableShipment] = useState<Shipment | null>(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const shipmentsQuery = useMemoFirebase(() => 
    !user ? null : query(collectionGroup(firestore, 'shipments'), orderBy('date', 'desc')), 
  [firestore, user]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);
  
  const usersQuery = useMemoFirebase(() => 
    !user ? null : query(collection(firestore, 'users')), 
  [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const shipmentsWithUsers = useMemo(() => {
    if (!shipments || !users) return [];
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    return shipments.map(shipment => ({
        ...shipment,
        user: usersMap.get(shipment.customerId),
        customerName: usersMap.get(shipment.customerId)?.fullName || 'N/A'
    }));
  }, [shipments, users]);
  
  const loading = isLoadingShipments || isLoadingUsers || isUserLoading;

  const handleOpenEmailDialog = (shipment: Shipment & { user?: UserProfile }) => {
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

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send email.');
      }


      toast({
        title: 'Email Sent',
        description: `An email update for shipment ${selectedShipment.trackingNumber} has been sent.`,
      });
    } catch (error) {
      toast({ title: 'Error Sending Email', description: (error as Error).message, variant: 'destructive' });
    }
    
    setIsSendingEmail(false);
    setIsEmailDialogOpen(false);
    setSelectedShipment(null);
  };
  
  const handleOpenEditDialog = (shipment: Shipment) => {
    setEditableShipment({ ...shipment });
    setIsEditDialogOpen(true);
  }

  const handleSaveChanges = () => {
    if (!editableShipment) return;
    setIsSaving(true);
    
    const shipmentDocRef = doc(firestore, 'users', editableShipment.customerId, 'shipments', editableShipment.id);

    // Using a copy to avoid passing non-serializable fields if any exist
    const { id, customerId, ...updateData } = editableShipment;
    
    updateDocumentNonBlocking(shipmentDocRef, updateData);

    toast({
        title: "Shipment Update Queued",
        description: `Shipment ${editableShipment.trackingNumber} will be updated shortly.`
    });
    
    setIsSaving(false);
    setIsEditDialogOpen(false);
    setEditableShipment(null);
  }
  
  const handleEditFormChange = (field: keyof Shipment, value: string | number) => {
    if(editableShipment) {
        setEditableShipment({...editableShipment, [field]: value});
    }
  }


  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Shipping Status</h1>
                <p className="text-muted-foreground">Track all current shipments.</p>
            </div>
             <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>
            An overview of all packages currently in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>}
              {!loading && shipmentsWithUsers.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{shipment.user?.fullName || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">{shipment.user?.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  </TableCell>
                  <TableCell>{shipment.contents}</TableCell>
                   <TableCell>{shipment.date ? new Date(shipment.date.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(shipment)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailDialog(shipment)} disabled={!shipment.user} title="Email functionality is disabled until RESEND_API_KEY is configured.">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!loading && shipmentsWithUsers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No shipments found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Customize Email</DialogTitle>
            <DialogDescription>
              Edit the email content before sending it to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                value={emailContent.subject}
                onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="body" className="text-right">
                Body
              </Label>
              <Textarea
                id="body"
                value={emailContent.body}
                onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                className="col-span-3 min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Shipment #{editableShipment?.trackingNumber}</DialogTitle>
            <DialogDescription>
              Update the details for this shipment. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editableShipment && (
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-contents">Contents</Label>
                    <Input id="edit-contents" value={editableShipment.contents} onChange={(e) => handleEditFormChange('contents', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={editableShipment.status} onValueChange={(value) => handleEditFormChange('status', value)}>
                            <SelectTrigger id="edit-status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Processed">Processed</SelectItem>
                                <SelectItem value="In Transit">In Transit</SelectItem>
                                <SelectItem value="Customs">Customs</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-payment-status">Payment Status</Label>
                        <Select value={editableShipment.paymentStatus} onValueChange={(value: 'Paid' | 'Unpaid') => handleEditFormChange('paymentStatus', value)}>
                            <SelectTrigger id="edit-payment-status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="edit-cost">Cost (USD)</Label>
                    <Input id="edit-cost" type="number" value={editableShipment.cost} onChange={(e) => handleEditFormChange('cost', Number(e.target.value))} />
                </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
