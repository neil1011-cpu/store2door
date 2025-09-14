
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
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading pre-alerts...</TableCell>
                </TableRow>
              ) : preAlerts.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">No pre-alerts found.</TableCell>
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
                          <Button variant="outline">View Invoice</Button>
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
