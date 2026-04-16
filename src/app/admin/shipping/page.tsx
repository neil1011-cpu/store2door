
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Mail, ArrowLeft, Edit, Loader2, Search } from 'lucide-react';
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
import type { Shipment, UserProfile, ShipmentStatus } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  collectionGroup,
  query,
  doc,
  updateDoc,
} from 'firebase/firestore';
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
  const [selectedShipment, setSelectedShipment] = useState<
    (Shipment & { user?: Partial<UserProfile> }) | null
  >(null);
  const [editableShipment, setEditableShipment] =
    useState<Shipment | null>(null);
  const [emailContent, setEmailContent] = useState({
    subject: '',
    body: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const firestore = useFirestore();
  const { user: adminUser, isUserLoading } = useUser();

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore || !adminUser) return null;
    return query(collectionGroup(firestore, 'shipments'));
  }, [firestore, adminUser]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !adminUser) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, adminUser]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const loading = isLoadingShipments || isLoadingUsers || isUserLoading;

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
        s.user?.email?.toLowerCase().includes(lowerTerm) ||
        s.contents.toLowerCase().includes(lowerTerm)
    );

  }, [shipments, users, searchTerm]);


  const handleOpenEmailDialog = (
    shipment: Shipment & { user?: Partial<UserProfile> }
  ) => {
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
        throw new Error(
          responseData.message || 'Failed to send email.'
        );
      }

      toast({
        title: 'Email Sent',
        description: `An email update for shipment ${selectedShipment.trackingNumber} has been sent.`,
      });
    } catch (error) {
      toast({
        title: 'Error Sending Email',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }

    setIsSendingEmail(false);
    setIsEmailDialogOpen(false);
    setSelectedShipment(null);
  };

  const handleOpenEditDialog = (shipment: Shipment) => {
    setEditableShipment({ ...shipment });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editableShipment) return;
    setIsSaving(true);
    
    const shipmentDocRef = doc(firestore, 'users', editableShipment.customerId, 'shipments', editableShipment.id);

    try {
        await updateDoc(shipmentDocRef, {
            contents: editableShipment.contents,
            status: editableShipment.status,
            paymentStatus: editableShipment.paymentStatus,
            cost: editableShipment.cost
        });
        toast({
          title: 'Shipment Updated',
          description: `Shipment ${editableShipment.trackingNumber} has been updated to "${editableShipment.status}".`,
        });
        setIsEditDialogOpen(false);
        setEditableShipment(null);
    } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: shipmentDocRef.path,
            operation: 'update',
            requestResourceData: { ...editableShipment }
        }));
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditFormChange = (
    field: keyof Shipment,
    value: string | number
  ) => {
    if (editableShipment) {
      setEditableShipment({
        ...editableShipment,
        [field]: value,
      });
    }
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
          <h1 className="text-3xl font-bold tracking-tight">
            Shipping Status
          </h1>
          <p className="text-muted-foreground">
            Track all current shipments and update their status.
          </p>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle>All Shipments</CardTitle>
                <CardDescription>
                    An overview of all packages currently in the system.
                </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search tracking, user..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                <TableHead>Date</TableHead>
                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentsWithUsers.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono">
                    {shipment.trackingNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {shipment.user?.fullName || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {shipment.user?.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(shipment.status)}
                    >
                      {shipment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{shipment.contents}</TableCell>
                  <TableCell>
                    {shipment.shippingDate
                      ? new Date(
                          (shipment.shippingDate as any).toDate()
                        ).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleOpenEditDialog(shipment)
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Update
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleOpenEmailDialog(shipment)
                      }
                      disabled={!shipment.user}
                      title={
                        !shipment.user
                          ? 'Cannot email customer without user data.'
                          : ''
                      }
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {shipmentsWithUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-24"
                  >
                    No shipments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
      >
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Customize Email</DialogTitle>
            <DialogDescription>
              Edit the email content before sending it to the
              customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="subject"
                className="text-right"
              >
                Subject
              </Label>
              <Input
                id="subject"
                value={emailContent.subject}
                onChange={(e) =>
                  setEmailContent({
                    ...emailContent,
                    subject: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setEmailContent({
                    ...emailContent,
                    body: e.target.value,
                  })
                }
                className="col-span-3 min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Update Shipment #
              {editableShipment?.trackingNumber}
            </DialogTitle>
            <DialogDescription>
              Set the current status showing if the package has arrived or moved to the next stage.
            </DialogDescription>
          </DialogHeader>
          {editableShipment && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contents">
                  Contents
                </Label>
                <Input
                  id="edit-contents"
                  value={editableShipment.contents}
                  onChange={(e) =>
                    handleEditFormChange(
                      'contents',
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">
                    Status
                  </Label>
                  <Select
                    value={editableShipment.status}
                    onValueChange={(value) =>
                      handleEditFormChange('status', value)
                    }
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Pre-Alert">Pre-Alert</SelectItem>
                      <SelectItem value="Received at Warehouse (FL)">Received at Warehouse (FL)</SelectItem>
                      <SelectItem value="Processed">Processed</SelectItem>
                       <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Being Shipped">Being Shipped</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Arrived in Jamaica">Arrived in Jamaica</SelectItem>
                      <SelectItem value="Customs">Customs</SelectItem>
                      <SelectItem value="On Route">On Route (Delivery)</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-payment-status">
                    Payment Status
                  </Label>
                  <Select
                    value={editableShipment.paymentStatus}
                    onValueChange={(value) =>
                      handleEditFormChange(
                        'paymentStatus',
                        value as 'Paid' | 'Unpaid'
                      )
                    }
                  >
                    <SelectTrigger id="edit-payment-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unpaid">
                        Unpaid
                      </SelectItem>
                      <SelectItem value="Paid">
                        Paid
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">
                  Cost (USD)
                </Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={editableShipment.cost}
                  onChange={(e) =>
                    handleEditFormChange(
                      'cost',
                      Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Package Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
