
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
  DialogClose,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PreAlert = {
  id: string;
  customer: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed';
  date: string;
  invoiceUrl: string;
  createdAt: Timestamp;
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

  const toDate = (timestamp: Timestamp | Date): Date => {
    if (!timestamp) {
        return new Date();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return timestamp.toDate();
  };

  useEffect(() => {
    const fetchPreAlerts = async () => {
      setLoading(true);
      try {
        const alertsCollection = collection(db, 'pre-alerts');
        const q = query(alertsCollection, orderBy('createdAt', 'desc'));
        const alertsSnapshot = await getDocs(q);
        const alertsList = alertsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            customer: data.customer,
            trackingNumber: data.trackingNumber,
            contents: data.contents,
            status: data.status,
            date: toDate(data.createdAt).toLocaleDateString('en-US'),
            invoiceUrl: 'https://placehold.co/600x800.png', // Placeholder
            createdAt: data.createdAt,
          }
        }) as PreAlert[];
        setPreAlerts(alertsList);
      } catch (error) {
        console.error("Error fetching pre-alerts: ", error);
        toast({
          title: 'Error fetching pre-alerts',
          description: 'Could not load data from the database.',
          variant: 'destructive',
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
    try {
      const alertToAdd = {
        ...newAlert,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'pre-alerts'), alertToAdd);
      
      const optimisticNewAlert: PreAlert = {
          id: docRef.id,
          ...newAlert,
          date: new Date().toLocaleDateString('en-US'),
          invoiceUrl: 'https://placehold.co/600x800.png',
          createdAt: Timestamp.now(),
      };

      setPreAlerts([optimisticNewAlert, ...preAlerts]);
      setOpen(false);
      setNewAlert({ customer: '', trackingNumber: '', contents: '', status: 'Pending' });
      toast({
        title: 'Pre-Alert Created',
        description: `Pre-alert for ${newAlert.trackingNumber} has been successfully created.`,
      });
    } catch (error) {
       console.error("Error creating pre-alert: ", error);
        toast({
            title: 'Error Creating Pre-Alert',
            description: 'There was a problem saving the new pre-alert.',
            variant: 'destructive',
        });
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
              <Button type="submit" onClick={handleCreateAlert}>Save Pre-Alert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                              width={800}
                              height={1000}
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
