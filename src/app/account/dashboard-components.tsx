

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Send, FileUp, Package, Loader2, LogOut, CreditCard, MoreHorizontal, FileText, Download, PlusCircle, MessageSquare, Users, Trash2 } from 'lucide-react';
import { AccountDetails, Shipment } from './page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';

// A mock list of shipments for the user. In a real app, this would be fetched.
const userShipments: Shipment[] = [
    { id: '1', trackingNumber: 'JM456', contents: 'Laptop from Amazon', status: 'In Transit', date: new Date().toLocaleDateString('en-US'), cost: 45.50, paymentStatus: 'Unpaid', invoiceUrl: placeholderImages.invoices.inv1.src },
    { id: '2', trackingNumber: 'JM789', contents: 'Books from eBay', status: 'Customs', date: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US'), cost: 22.00, paymentStatus: 'Unpaid', invoiceUrl: placeholderImages.invoices.inv2.src},
    { id: '3', trackingNumber: 'JM101', contents: 'Shoes from Zappos', status: 'Delivered', date: new Date(new Date().setDate(new Date().getDate() - 5)).toLocaleDateString('en-US'), cost: 30.00, paymentStatus: 'Paid', invoiceUrl: placeholderImages.invoices.inv3.src },
];


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


export function DashboardTab({ details }: { details: AccountDetails }) {
  const recentShipment = userShipments.length > 0 ? userShipments[0] : null;

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
            {recentShipment ? (
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


export function PreAlertTab({ customerName }: { customerName: string }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [contents, setContents] = useState('');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !contents || !invoice) {
        toast({ title: 'Missing Fields', description: 'Please fill out all fields and upload an invoice.', variant: 'destructive'});
        return;
    }

    setLoading(true);
    // Here you would typically handle the file upload to a storage service
    // and then send the data to your API. We'll simulate this.
    try {
        const response = await fetch('/api/warehouse/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: customerName,
                trackingId: trackingNumber,
                contents: contents,
                status: 'Pending'
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create pre-alert.');
        }

        toast({ title: 'Pre-Alert Submitted!', description: 'We have received your pre-alert and will process it shortly.' });
        setTrackingNumber('');
        setContents('');
        setInvoice(null);
        // Reset file input if needed
        const fileInput = document.getElementById('invoice-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';

    } catch (error) {
        toast({ title: 'Submission Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
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

export function PackagesTab() {
  const { toast } = useToast();

  const handlePayNow = (shipment: Shipment) => {
    // In a real application, this would redirect to a payment gateway (e.g., Stripe, PayPal).
    // For this prototype, we'll just show a toast message.
    toast({
        title: "Payment Gateway",
        description: `Redirecting to payment for shipment ${shipment.trackingNumber} - Total: $${shipment.cost?.toFixed(2)}`,
    });
  };

  const handleDownloadInvoice = (shipment: Shipment) => {
    // This is a simple implementation for demonstration.
    // In a real-world scenario, you might want to fetch a secure URL or a blob.
    const link = document.createElement('a');
    link.href = shipment.invoiceUrl;
    link.download = `Invoice-${shipment.trackingNumber}.pdf`; // Assuming PDF, could be dynamic
    link.target = '_blank'; // Open in new tab to prevent navigation issues
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
            {userShipments.map((shipment) => (
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
                            {shipment.paymentStatus === 'Paid' ? 'Paid' : 'No Cost'}
                        </Badge>
                    )}
                </TableCell>
                 <TableCell className="text-right">
                    <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
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
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Invoice for {shipment.trackingNumber}</DialogTitle>
                                <DialogDescription>Invoice for your shipment: {shipment.contents}.</DialogDescription>
                            </DialogHeader>
                            <div className="relative h-[600px] overflow-hidden rounded-md">
                                <Image 
                                    src={shipment.invoiceUrl} 
                                    alt={`Invoice for ${shipment.trackingNumber}`} 
                                    fill
                                    className="object-contain"
                                    data-ai-hint="invoice document"
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                 </TableCell>
              </TableRow>
            ))}
             {userShipments.length === 0 && (
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


type Message = {
    id: string;
    conversationId: string;
    sender: 'user' | 'agent';
    text: string;
    timestamp: string;
};

type Conversation = {
    id: string;
    subject: string;
    status: 'Open' | 'Closed';
    messages: Message[];
    lastUpdate: string;
}

const mockConversations: Conversation[] = [
    {
        id: 'conv1',
        subject: 'Question about my last shipment',
        status: 'Open',
        lastUpdate: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleString(),
        messages: [
            { id: 'msg1', conversationId: 'conv1', sender: 'user', text: 'Hi there, I was just wondering about the status of my last package, tracking number JM789. It seems to be stuck in customs. Can you provide an update? Thanks!', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleString() },
            { id: 'msg2', conversationId: 'conv1', sender: 'agent', text: 'Hello! Thanks for reaching out. We see that your package is currently undergoing standard customs inspection. This usually takes 2-3 business days. We will notify you as soon as it clears.', timestamp: new Date().toLocaleString() },
        ],
    },
    {
        id: 'conv2',
        subject: 'Address Update',
        status: 'Closed',
        lastUpdate: new Date(new Date().setDate(new Date().getDate() - 3)).toLocaleString(),
        messages: [
            { id: 'msg3', conversationId: 'conv2', sender: 'user', text: 'Hello, I need to update my delivery address for future shipments. Please let me know what information you need from me. Best, Alicia', timestamp: new Date(new Date().setDate(new Date().getDate() - 3)).toLocaleString() },
        ]
    }
]


export function SupportTab({ customerName }: { customerName: string }) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [loading, setLoading] = useState(false);
  const [openNewMessageDialog, setOpenNewMessageDialog] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const supportAvatar = placeholderImages.avatars.supportAgent;

  const handleSendMessage = async () => {
    if (!subject || !message) {
      toast({ title: "Missing Fields", description: "Please provide a subject and message.", variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // In a real app, this would send to your backend.
      // We will simulate creating a new conversation.
      const newConversation: Conversation = {
        id: `conv${conversations.length + 1}`,
        subject: subject,
        status: 'Open',
        lastUpdate: new Date().toLocaleString(),
        messages: [{
            id: `msg${Math.random()}`,
            conversationId: `conv${conversations.length + 1}`,
            sender: 'user',
            text: message,
            timestamp: new Date().toLocaleString()
        }]
      };
      
      setConversations([newConversation, ...conversations]);
      toast({ title: 'Message Sent!', description: 'Our support team will get back to you shortly.' });
      setSubject('');
      setMessage('');
      setOpenNewMessageDialog(false);
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Support Inbox</CardTitle>
            <CardDescription>View your conversations with our support team.</CardDescription>
        </div>
        <Dialog open={openNewMessageDialog} onOpenChange={setOpenNewMessageDialog}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Message
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Compose a new message</DialogTitle>
                    <DialogDescription>Our support team will respond as soon as possible.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="e.g., Question about my package" value={subject} onChange={e => setSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" placeholder="Please describe your issue in detail..." className="min-h-[150px]" value={message} onChange={e => setMessage(e.target.value)} />
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSendMessage} disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </CardHeader>
      <CardContent>
         <Accordion type="single" collapsible className="w-full">
            {conversations.map(conv => (
                <AccordionItem value={conv.id} key={conv.id}>
                    <AccordionTrigger>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full pr-4 text-left">
                            <div className="flex items-center gap-4">
                               <Badge variant={conv.status === 'Open' ? 'destructive' : 'secondary'}>{conv.status}</Badge>
                               <span className="font-medium">{conv.subject}</span>
                            </div>
                            <span className="text-sm text-muted-foreground mt-1 md:mt-0">
                                Last updated: {conv.lastUpdate}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 space-y-4">
                            {conv.messages.map(msg => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                                     {msg.sender === 'agent' && (
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={supportAvatar.src} alt={supportAvatar.alt} />
                                            <AvatarFallback>SA</AvatarFallback>
                                        </Avatar>
                                     )}
                                     <div className={cn("rounded-lg p-3 max-w-lg", msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-xs mt-1 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                     </div>
                                      {msg.sender === 'user' && (
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{customerName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                     )}
                                </div>
                            ))}
                             <div className="pt-4">
                                <Textarea placeholder="Write a reply..." className="mb-2" />
                                <Button size="sm">
                                    <Send className="mr-2 h-4 w-4" />
                                    Reply
                                </Button>
                             </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
         </Accordion>
      </CardContent>
    </Card>
  );
}

type PickupPerson = {
    id: number;
    name: string;
    idNumber: string;
};

export function AccountTab({ details }: { details: AccountDetails }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const fullAddress = `${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;

    const [pickupPersonnel, setPickupPersonnel] = useState<PickupPerson[]>([
        { id: 1, name: 'John Brown', idNumber: '123456-7' }
    ]);
    const [openAddPersonDialog, setOpenAddPersonDialog] = useState(false);
    const [newPerson, setNewPerson] = useState({ name: '', idNumber: '' });


    const handleCopy = () => {
        navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        toast({
            title: 'Address Copied!',
            description: 'Your US address has been copied to the clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddPerson = () => {
        if (!newPerson.name || !newPerson.idNumber) {
            toast({ title: "Missing Fields", description: "Please enter a name and ID number.", variant: 'destructive' });
            return;
        }
        setPickupPersonnel([...pickupPersonnel, { ...newPerson, id: Date.now() }]);
        setNewPerson({ name: '', idNumber: '' });
        setOpenAddPersonDialog(false);
        toast({ title: "Pickup Person Added", description: `${newPerson.name} can now pick up packages on your behalf.` });
    };

    const handleRemovePerson = (id: number) => {
        setPickupPersonnel(pickupPersonnel.filter(p => p.id !== id));
        toast({ title: "Pickup Person Removed" });
    };

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
                        <p className="font-mono">{details.address.address1}</p>
                        <p className="font-mono font-bold text-primary">{details.address.address2}</p>
                        <p className="font-mono">{details.address.city}, {details.address.state} {details.address.zip}</p>
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
                                            <Button variant="ghost" size="icon" onClick={() => handleRemovePerson(person.id)}>
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
