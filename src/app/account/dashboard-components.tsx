
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Send, FileUp, Package, Loader2, CreditCard, MoreHorizontal, FileText, Download, PlusCircle, MessageSquare, Trash2, Home, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UserProfile, Shipment, Conversation, Message, PickupPerson, DropoffAddress } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const getStatusVariant = (status: Shipment['status']) => {
  switch (status) {
    case 'In Transit': return 'default';
    case 'Customs': return 'secondary';
    case 'Delivered': return 'outline';
    case 'Pending': return 'destructive';
    case 'Processed': return 'secondary';
    default: return 'default';
  }
};


export function DashboardTab({ details }: { details: UserProfile }) {
  const firestore = useFirestore();
  const shipmentsQuery = useMemoFirebase(() => details ? query(collection(firestore, 'users', details.id, 'shipments'), orderBy('date', 'desc'), limit(1)) : null, [firestore, details]);
  const { data: shipments, isLoading } = useCollection<Shipment>(shipmentsQuery);

  const recentShipment = shipments?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>A quick overview of your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" /> Latest Shipment Status
                </CardTitle>
            </CardHeader>
            {isLoading ? <CardContent><Loader2 className="h-6 w-6 animate-spin" /></CardContent> :
             recentShipment ? (
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking #:</span>
                    <span className="font-mono">{recentShipment.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Contents:</span>
                    <span>{recentShipment.contents}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={getStatusVariant(recentShipment.status)}>{recentShipment.status}</Badge>
                </div>
            </CardContent>
             ) : (
                <CardContent>
                    <p className="text-muted-foreground">You have no active shipments.</p>
                </CardContent>
             )}
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileUp className="h-5 w-5" /> Create a Pre-Alert
                </CardTitle>
                 <CardDescription>
                    Upload your invoice to notify us of an incoming package.
                </CardDescription>
            </CardHeader>
            <CardContent>
               <Button>Go to Pre-Alert</Button>
            </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}


export function PreAlertTab({ customerId, customerName }: { customerId: string, customerName: string }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [contents, setContents] = useState('');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !contents || !invoice) {
        toast({ title: 'Missing Fields', description: 'Please fill out all fields and upload an invoice.', variant: 'destructive'});
        return;
    }

    setLoading(true);
    // In a real app, you would upload the invoice to Firebase Storage and get a URL
    const mockInvoiceUrl = `https://picsum.photos/seed/${Date.now()}/800/1100`;

    const preAlertsCollection = collection(firestore, 'users', customerId, 'pre_alerts');
    const newPreAlert = {
        customerName,
        customerId,
        trackingNumber,
        contents,
        status: 'Pending' as 'Pending',
        date: serverTimestamp(),
        invoiceUrl: mockInvoiceUrl,
    };

    addDocumentNonBlocking(preAlertsCollection, newPreAlert);

    toast({ title: 'Pre-Alert Submitted!', description: 'We have received your pre-alert and will process it shortly.' });
    setTrackingNumber('');
    setContents('');
    setInvoice(null);
    
    const fileInput = document.getElementById('invoice-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
    
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Pre-Alert</CardTitle>
        <CardDescription>
          Let us know about an incoming package by providing the details and uploading the invoice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tracking-number">Tracking Number</Label>
            <Input id="tracking-number" placeholder="Enter the package tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contents">Contents Description</Label>
            <Input id="contents" placeholder="e.g., Nike shoes, Amazon order" value={contents} onChange={(e) => setContents(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="invoice-upload">Upload Invoice</Label>
            <Input id="invoice-upload" type="file" accept="image/*,.pdf" onChange={(e) => setInvoice(e.target.files ? e.target.files[0] : null)} />
             <p className="text-sm text-muted-foreground">Please upload a clear image or PDF of your invoice.</p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Pre-Alert'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PackagesTab({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const shipmentsQuery = useMemoFirebase(() => customerId ? query(collection(firestore, 'users', customerId, 'shipments'), orderBy('date', 'desc')) : null, [firestore, customerId]);
  const { data: userShipments, isLoading } = useCollection<Shipment>(shipmentsQuery);

  const handlePayNow = (shipment: Shipment) => {
    toast({
        title: "Payment Gateway",
        description: `Redirecting to payment for invoice ${shipment.invoiceId} - Total: $${shipment.cost?.toFixed(2)}`,
    });
  };

  const handleDownloadInvoice = (shipment: Shipment) => {
    if (!shipment.invoiceUrl) {
        toast({ title: "No Invoice", description: "There is no invoice available for this shipment.", variant: "destructive" });
        return;
    }
    const link = document.createElement('a');
    link.href = shipment.invoiceUrl;
    link.download = `Invoice-${shipment.invoiceId || shipment.trackingNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
        title: "Downloading Invoice",
        description: `Your invoice for ${shipment.trackingNumber} is downloading.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Packages</CardTitle>
        <CardDescription>Here is the status of all your shipments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Contents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}
            {userShipments && userShipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                <TableCell>{shipment.contents}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                    {shipment.cost ? `$${shipment.cost.toFixed(2)}` : 'N/A'}
                </TableCell>
                <TableCell>
                    {shipment.paymentStatus === 'Unpaid' && shipment.cost ? (
                        <Button size="sm" onClick={() => handlePayNow(shipment)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay Now
                        </Button>
                    ) : (
                        <Badge variant={shipment.paymentStatus === 'Paid' ? 'outline' : 'secondary'}>
                            {shipment.paymentStatus === 'Paid' ? 'Paid' : (shipment.cost ? 'Awaiting Payment' : 'No Cost')}
                        </Badge>
                    )}
                </TableCell>
                 <TableCell className="text-right">
                    <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!shipment.invoiceUrl}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">More actions</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DialogTrigger asChild>
                                    <DropdownMenuItem>
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Invoice
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <DropdownMenuItem onClick={() => handleDownloadInvoice(shipment)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Invoice for {shipment.trackingNumber}</DialogTitle>
                                <DialogDescription>Invoice for your shipment: {shipment.contents}.</DialogDescription>
                            </DialogHeader>
                            <div className="relative h-[600px] overflow-hidden rounded-md border">
                                {shipment.invoiceUrl?.startsWith('data:application/pdf') ? (
                                    <embed src={shipment.invoiceUrl} type="application/pdf" width="100%" height="100%" />
                                ) : (
                                    <Image 
                                        src={shipment.invoiceUrl || placeholderImages.generatedInvoice.src} 
                                        alt={`Invoice for ${shipment.trackingNumber}`} 
                                        fill
                                        className="object-contain"
                                        data-ai-hint="invoice document"
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                 </TableCell>
              </TableRow>
            ))}
             {!isLoading && userShipments?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">You have no shipments yet.</TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SupportTab({ details }: { details: UserProfile }) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const firestore = useFirestore();

  const convosQuery = useMemoFirebase(() => details ? query(collection(firestore, 'users', details.id, 'conversations'), orderBy('latestDate', 'desc')) : null, [firestore, details]);
  const { data: conversations, isLoading: isLoadingConversations } = useCollection<Conversation>(convosQuery);

  const messagesQuery = useMemoFirebase(() => activeConversation ? query(collection(firestore, 'users', details.id, 'conversations', activeConversation.id, 'messages'), orderBy('date', 'asc')) : null, [firestore, details, activeConversation]);
  const { data: messages, isLoading: isLoadingMessages } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversation) {
        setActiveConversation(conversations[0]);
    }
  }, [conversations, activeConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || (!activeConversation && !subject.trim())) {
      toast({ title: "Missing fields", description: "Please enter a subject and message.", variant: "destructive"});
      return;
    }

    setSending(true);

    let conversationId = activeConversation?.id;

    // Create a new conversation if one doesn't exist
    if (!conversationId) {
        const convosCollection = collection(firestore, 'users', details.id, 'conversations');
        const newConvoRef = await addDoc(convosCollection, {
            customerName: details.fullName,
            customerId: details.id,
            subject: subject,
            latestMessage: newMessage,
            latestDate: serverTimestamp(),
            isRead: false,
            date: serverTimestamp()
        });
        conversationId = newConvoRef.id;
    }

    // Add the new message
    const messagesCollection = collection(firestore, 'users', details.id, 'conversations', conversationId, 'messages');
    addDocumentNonBlocking(messagesCollection, {
        conversationId: conversationId,
        customerId: details.id,
        customerName: details.fullName,
        subject: activeConversation?.subject || subject,
        message: newMessage,
        sender: 'user',
        status: 'Open',
        date: serverTimestamp(),
    });
    
    // Update the latest message on the conversation
    const convoDoc = doc(firestore, 'users', details.id, 'conversations', conversationId);
    updateDocumentNonBlocking(convoDoc, {
        latestMessage: newMessage,
        latestDate: serverTimestamp(),
        isRead: false
    });

    setNewMessage("");
    if (!activeConversation) setSubject("");
    toast({ title: "Message Sent!", description: "We've received your message and will get back to you shortly." });
    setSending(false);
  };

  return (
    <Card className="flex flex-col h-full max-h-[75vh]">
      <CardHeader>
        <CardTitle>Support Center</CardTitle>
        <CardDescription>
          Send us a message with any questions or concerns.
        </CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 px-6 pb-4">
        <div className="space-y-6">
          {(isLoadingConversations || isLoadingMessages) && <div className="text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
          {!isLoadingMessages && !isLoadingConversations && (!messages || messages.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              <Inbox className="h-12 w-12 mx-auto" />
              <p className="mt-2">You have no messages. Start a new conversation below.</p>
            </div>
          )}
          {messages && messages.map(msg => (
            <div key={msg.id} className={cn("flex items-end gap-3", msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.sender === 'agent' ? placeholderImages.avatars.supportAgent.src : undefined} />
                <AvatarFallback>{msg.sender === 'agent' ? 'S' : details.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={cn("text-xs mt-2", msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{msg.date ? new Date(msg.date.toDate()).toLocaleString() : 'Just now'}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <CardFooter className="pt-4 border-t flex-col items-start gap-4">
        {!activeConversation && (
            <div className="w-full space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Question about my invoice" />
            </div>
        )}
        <div className="w-full space-y-2">
          <Label htmlFor="new-message">{activeConversation ? "Your Reply" : "Your Message"}</Label>
          <Textarea 
            id="new-message" 
            placeholder="Type your message here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
        </div>
        <Button onClick={handleSendMessage} disabled={sending}>
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const userDocRef = doc(firestore, 'users', details.id);

    const fullAddress = `${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.zip}`;

    const [openAddPersonDialog, setOpenAddPersonDialog] = useState(false);
    const [newPerson, setNewPerson] = useState({ name: '', idNumber: '' });
    
    const [openAddAddressDialog, setOpenAddAddressDialog] = useState(false);
    const [newAddress, setNewAddress] = useState({ name: '', address: '', parish: '' });

    const handleCopy = () => {
        navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        toast({
            title: 'Address Copied!',
            description: 'Your US address has been copied to the clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddPerson = async () => {
        if (!newPerson.name || !newPerson.idNumber) {
            toast({ title: "Missing Fields", description: "Please enter a name and ID number.", variant: 'destructive' });
            return;
        }

        const personToAdd: PickupPerson = { ...newPerson, id: `person-${Date.now()}` };
        
        updateDocumentNonBlocking(userDocRef, {
            pickupPersonnel: arrayUnion(personToAdd)
        });
        
        setNewPerson({ name: '', idNumber: '' });
        setOpenAddPersonDialog(false);
        toast({ title: "Pickup Person Added", description: `${newPerson.name} can now pick up packages on your behalf.` });
    };

    const handleRemovePerson = async (personToRemove: PickupPerson) => {
        updateDocumentNonBlocking(userDocRef, {
            pickupPersonnel: arrayRemove(personToRemove)
        });
        toast({ title: "Pickup Person Removed" });
    };

    const handleAddAddress = async () => {
        if (!newAddress.name || !newAddress.address || !newAddress.parish) {
            toast({ title: "Missing Fields", description: "Please fill out all address fields.", variant: 'destructive' });
            return;
        }

        const addressToAdd: DropoffAddress = { ...newAddress, id: `addr-${Date.now()}` };
        updateDocumentNonBlocking(userDocRef, {
            dropoffAddresses: arrayUnion(addressToAdd)
        });

        setNewAddress({ name: '', address: '', parish: '' });
        setOpenAddAddressDialog(false);
        toast({ title: "Address Added", description: `New drop-off address "${newAddress.name}" has been saved.` });
    };

    const handleRemoveAddress = async (addressToRemove: DropoffAddress) => {
        updateDocumentNonBlocking(userDocRef, {
            dropoffAddresses: arrayRemove(addressToRemove)
        });
        toast({ title: "Address Removed" });
    };
    
    const pickupPersonnel = details.pickupPersonnel || [];
    const dropoffAddresses = details.dropoffAddresses || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Account</CardTitle>
                <CardDescription>Your personal account details and US shipping address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2">Your US Address</h3>
                    <div className="relative rounded-lg border bg-muted p-4 space-y-1">
                        <p className="font-mono">{details.fullName}</p>
                        <p className="font-mono">{details.address.address1}</p>
                        <p className="font-mono font-bold text-primary">{details.address.address2}</p>
                        <p className="font-mono">{details.address.city}, {details.address.state} {details.zip}</p>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Use this address as your shipping destination when shopping from US stores.
                    </p>
                </div>
                <Separator />
                <div>
                    <h3 className="font-semibold text-lg mb-2">Account Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Full Name:</span>
                            <span>{details.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{details.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone Number:</span>
                            <span>{details.phone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Mailbox Number:</span>
                            <span className="font-mono">{details.mailboxNumber}</span>
                        </div>
                    </div>
                </div>
                 <Separator />
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Drop-off Addresses</h3>
                        <Dialog open={openAddAddressDialog} onOpenChange={setOpenAddAddressDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Address
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Drop-off Address</DialogTitle>
                                    <DialogDescription>
                                        Add a new address in Jamaica for package deliveries.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="address-name">Address Name</Label>
                                        <Input id="address-name" placeholder="e.g., Home, Work, Mom's House" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address-street">Street Address</Label>
                                        <Input id="address-street" placeholder="e.g., 123 Sunshine Avenue" value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="address-parish">Parish</Label>
                                        <Input id="address-parish" placeholder="e.g., Kingston" value={newAddress.parish} onChange={e => setNewAddress({ ...newAddress, parish: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleAddAddress}>Add Address</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage your delivery addresses in Jamaica.
                    </p>
                    <div className="space-y-3">
                         {dropoffAddresses.length === 0 && (
                            <div className="text-center text-muted-foreground border rounded-lg p-8">
                                <p>No drop-off addresses added yet.</p>
                            </div>
                         )}
                         {dropoffAddresses.map(addr => (
                            <Card key={addr.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-muted p-3 rounded-full">
                                        <Home className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{addr.name}</p>
                                        <p className="text-sm text-muted-foreground">{addr.address}, {addr.parish}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveAddress(addr)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Address</span>
                                </Button>
                            </Card>
                         ))}
                    </div>
                </div>
                 <Separator />
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Pickup Personnel</h3>
                        <Dialog open={openAddPersonDialog} onOpenChange={setOpenAddPersonDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Person
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Pickup Person</DialogTitle>
                                    <DialogDescription>
                                        Add someone who is authorized to pick up packages on your behalf.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pickup-name">Full Name</Label>
                                        <Input id="pickup-name" placeholder="e.g., Jane Doe" value={newPerson.name} onChange={e => setNewPerson({ ...newPerson, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pickup-id">Government Issued ID #</Label>
                                        <Input id="pickup-id" placeholder="e.g., Driver's License or TRN" value={newPerson.idNumber} onChange={e => setNewPerson({ ...newPerson, idNumber: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleAddPerson}>Add Person</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage who can pick up packages for you. They must present their ID.
                    </p>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>ID Number</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pickupPersonnel.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No pickup personnel added.</TableCell>
                                    </TableRow>
                                )}
                                {pickupPersonnel.map(person => (
                                    <TableRow key={person.id}>
                                        <TableCell className="font-medium">{person.name}</TableCell>
                                        <TableCell>{person.idNumber}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemovePerson(person)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
