
'use client';

import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { PlusCircle, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { generateCustomsForm, GenerateCustomsFormOutput } from '@/ai/flows/generate-customs-form';
import { Separator } from '@/components/ui/separator';

type PreAlert = {
  id: string;
  customer: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed';
  date: string;
  invoiceUrl: string;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'destructive';
    case 'Processed':
      return 'secondary';
    default:
      return 'default';
  }
};

function GeneratedDocsDialog({ trackingNumber, weight, contents, invoiceDataUri }: { trackingNumber: string, weight: string, contents: string, invoiceDataUri: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GenerateCustomsFormOutput | null>(null);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await generateCustomsForm({
                trackingNumber,
                weight,
                contentsDescription: contents,
                invoiceDataUri,
            });
            setResult(response);
        } catch (error) {
            toast({
                title: 'Error Generating Documents',
                description: (error as Error).message || "An unexpected error occurred.",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Docs
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Generate Shipping Documents</DialogTitle>
                    <DialogDescription>
                        Use AI to generate a customs form and warehouse ticket for tracking number {trackingNumber}.
                    </DialogDescription>
                </DialogHeader>
                
                {!result && !loading && (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                         <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                         <p className="text-muted-foreground mb-6">Click the button below to start the AI generation process.</p>
                         <Button onClick={handleGenerate}>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Documents
                        </Button>
                    </div>
                )}
                
                {loading && (
                     <div className="flex items-center justify-center p-8">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground">AI is processing the invoice... Please wait.</p>
                    </div>
                )}

                {result && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 max-h-[60vh] overflow-y-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Jamaica Customs Form</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Tracking #</span>
                                    <span>{result.customsForm.trackingNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Weight</span>
                                    <span>{result.customsForm.weight}</span>
                                </div>
                                 <Separator />
                                 <div className="space-y-1">
                                    <span className="font-medium text-muted-foreground">Contents</span>
                                    <p className="text-right">{result.customsForm.contentsDescription}</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <span className="font-medium text-muted-foreground">Sender</span>
                                    <p className="text-right">{result.customsForm.sender}</p>
                                </div>
                                 <Separator />
                                <div className="space-y-1">
                                    <span className="font-medium text-muted-foreground">Recipient</span>
                                    <p className="text-right">{result.customsForm.recipient}</p>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Warehouse Intake Ticket</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                               <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Ticket ID</span>
                                    <span className="font-mono">{result.warehouseTicket.ticketId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-muted-foreground">Tracking #</span>
                                    <span>{result.warehouseTicket.trackingNumber}</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span className="font-medium text-muted-foreground">Status</span>
                                    <Badge variant="default">{result.warehouseTicket.status}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function PreAlertsPage() {
  const [preAlerts, setPreAlerts] = useState<PreAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [newAlert, setNewAlert] = useState({
    customer: '',
    trackingNumber: '',
    contents: '',
    status: 'Pending' as 'Pending' | 'Processed',
  });

  useEffect(() => {
    const fetchPreAlerts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/warehouse/intake');
        if (!response.ok) {
          throw new Error('Failed to fetch pre-alerts');
        }
        const data = await response.json();
        setPreAlerts(data);
      } catch (error) {
        toast({
            title: 'Error',
            description: (error as Error).message,
            variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPreAlerts();
  }, [toast]);


  const handleCreateAlert = async () => {
    if (!newAlert.customer || !newAlert.trackingNumber || !newAlert.contents) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/warehouse/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerName: newAlert.customer,
            trackingId: newAlert.trackingNumber,
            contents: newAlert.contents,
            status: newAlert.status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create pre-alert');
      }

      const newPreAlert = await response.json();
      setPreAlerts([newPreAlert, ...preAlerts]);
      setOpen(false);
      setNewAlert({ customer: '', trackingNumber: '', contents: '', status: 'Pending' });
      toast({
        title: 'Pre-Alert Created',
        description: `Pre-alert for ${newAlert.trackingNumber} has been successfully created.`,
      });
    } catch (error) {
      toast({
        title: 'Error creating pre-alert',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pre-Alerts</h1>
          <p className="text-muted-foreground">
            View and manage incoming pre-alerts from customers.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Pre-Alert
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create New Pre-Alert</DialogTitle>
                <DialogDescription>
                    Enter the details for the new pre-alert.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer" className="text-right">
                    Customer
                    </Label>
                    <Input id="customer" value={newAlert.customer} onChange={(e) => setNewAlert({...newAlert, customer: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="trackingNumber" className="text-right">
                    Tracking #
                    </Label>
                    <Input id="trackingNumber" value={newAlert.trackingNumber} onChange={(e) => setNewAlert({...newAlert, trackingNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contents" className="text-right">
                    Contents
                    </Label>
                    <Input id="contents" value={newAlert.contents} onChange={(e) => setNewAlert({...newAlert, contents: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                    Status
                    </Label>
                    <Select
                    onValueChange={(value: PreAlert['status']) => setNewAlert({...newAlert, status: value})}
                    defaultValue={newAlert.status}
                    >
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processed">Processed</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                </div>
                <DialogFooter>
                <Button type="submit" onClick={handleCreateAlert} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Pre-Alert'}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Incoming Pre-Alerts</CardTitle>
          <CardDescription>
            A list of all pre-alerts submitted by customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading pre-alerts...</TableCell>
                </TableRow>
              ) : preAlerts.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center">No pre-alerts found.</TableCell>
                </TableRow>
              ) : (
                preAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">
                      {alert.customer}
                    </TableCell>
                    <TableCell>{alert.trackingNumber}</TableCell>
                    <TableCell>{alert.contents}</TableCell>
                    <TableCell>{alert.date}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(alert.status)}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">View Invoice</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>
                              Invoice for {alert.trackingNumber}
                            </DialogTitle>
                            <DialogDescription>
                              Invoice submitted by {alert.customer}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="p-4">
                            <Image
                              src={alert.invoiceUrl}
                              alt={`Invoice for ${alert.trackingNumber}`}
                              width={600}
                              height={800}
                              className="w-full h-auto"
                              data-ai-hint="invoice document"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                     <TableCell>
                      <GeneratedDocsDialog 
                        trackingNumber={alert.trackingNumber}
                        weight="5 lbs"
                        contents={alert.contents}
                        invoiceDataUri={alert.invoiceUrl}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
