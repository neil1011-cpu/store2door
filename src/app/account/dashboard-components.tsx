
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Send, FileUp, Package, Loader2 } from 'lucide-react';
import { AccountDetails, Shipment } from './page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


// A mock list of shipments for the user. In a real app, this would be fetched.
const userShipments: Shipment[] = [
    { id: '1', trackingNumber: 'JM456', contents: 'Laptop from Amazon', status: 'In Transit', date: new Date().toLocaleDateString('en-US')},
    { id: '2', trackingNumber: 'JM789', contents: 'Books from eBay', status: 'Customs', date: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US')},
    { id: '3', trackingNumber: 'JM101', contents: 'Shoes from Zappos', status: 'Delivered', date: new Date(new Date().setDate(new Date().getDate() - 5)).toLocaleDateString('en-US')},
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
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userShipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                <TableCell>{shipment.contents}</TableCell>
                <TableCell>{shipment.date}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
             {userShipments.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">You have no shipments yet.</TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export function SupportTab() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSendMessage = () => {
        if(!subject || !message) {
            toast({ title: "Missing Fields", description: "Please provide a subject and message.", variant: 'destructive'});
            return;
        }
        toast({ title: 'Message Sent!', description: 'Our support team will get back to you shortly.' });
        setSubject('');
        setMessage('');
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>Have a question or issue? Send us a message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="e.g., Question about my package" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
         <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Please describe your issue in detail..." className="min-h-[150px]" value={message} onChange={e => setMessage(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSendMessage}><Send className="mr-2 h-4 w-4" /> Send Message</Button>
      </CardFooter>
    </Card>
  );
}

export function AccountTab({ details }: { details: AccountDetails }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const fullAddress = `${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        toast({
            title: 'Address Copied!',
            description: 'Your US address has been copied to the clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
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
            </CardContent>
        </Card>
    )
}
