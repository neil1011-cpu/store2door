
'use client';

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
} from '@/components/ui/dialog';
import Image from 'next/image';

const preAlerts = [
  {
    customer: 'John Doe',
    trackingNumber: 'JM456',
    contents: 'Electronics',
    status: 'Pending',
    date: '2024-07-29',
    invoiceUrl: 'https://placehold.co/600x800.png',
  },
  {
    customer: 'Jane Smith',
    trackingNumber: 'JM789',
    contents: 'Clothing',
    status: 'Processed',
    date: '2024-07-28',
    invoiceUrl: 'https://placehold.co/600x800.png',
  },
  {
    customer: 'Carlos Garcia',
    trackingNumber: 'JM101',
    contents: 'Books',
    status: 'Pending',
    date: '2024-07-29',
    invoiceUrl: 'https://placehold.co/600x800.png',
  },
  {
    customer: 'Maria Rodriguez',
    trackingNumber: 'JM212',
    contents: 'Home Goods',
    status: 'Processed',
    date: '2024-07-27',
    invoiceUrl: 'https://placehold.co/600x800.png',
  },
];

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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Pre-Alerts</h1>
        <p className="text-muted-foreground">
          View and manage incoming pre-alerts from customers.
        </p>
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
              {preAlerts.map((alert) => (
                <TableRow key={alert.trackingNumber}>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
