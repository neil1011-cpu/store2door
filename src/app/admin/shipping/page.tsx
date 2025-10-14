
'use client';

import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { shipments as allShipments, type Shipment } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  const [shipments, setShipments] = useState<Shipment[]>(allShipments);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [editableShipment, setEditableShipment] = useState<Shipment | null>(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEmailDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    // In a real app you'd get the customer details from the user collection
    const customerName = 'Valued Customer';
    setEmailContent({
      subject: `Update for your shipment: ${shipment.trackingNumber}`,
      body: `Dear ${customerName},\n\nHere's an update on your shipment ${shipment.trackingNumber}:\n\nThe current status is: ${shipment.status}.\n\nThank you for shipping with us!\nFromStore2Door`,
    });
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!selectedShipment) return;
    toast({
      title: 'Email Sent',
      description: `An email update for shipment ${selectedShipment.trackingNumber} has been sent.`,
    });
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
    
    // Simulate API call
    setTimeout(() => {
        const updatedShipments = shipments.map(s => s.id === editableShipment.id ? editableShipment : s);
        setShipments(updatedShipments);

        // also update mock data source
        const index = allShipments.findIndex(s => s.id === editableShipment.id);
        if(index > -1) allShipments[index] = editableShipment;
        
        toast({
            title: "Shipment Updated",
            description: `Shipment ${editableShipment.trackingNumber} has been updated.`
        });
        setIsSaving(false);
        setIsEditDialogOpen(false);
        setEditableShipment(null);
    }, 1000);
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
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{shipment.customerId}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  </TableCell>
                  <TableCell>{shipment.contents}</TableCell>
                   <TableCell>{new Date(shipment.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(shipment)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailDialog(shipment)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
            <Button onClick={handleSendEmail}>Send Email</Button>
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
                        <Select value={editableShipment.paymentStatus} onValueChange={(value) => handleEditFormChange('paymentStatus', value)}>
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
                    <Input id="edit-cost" type="number" value={editableShipment.cost} onChange={(e) => handleEditFormChange('cost', e.target.value)} />
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

    