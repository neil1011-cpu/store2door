
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
import { MoreHorizontal, FileText } from 'lucide-react';

const preAlerts = [
  {
    id: 1,
    user: 'John Doe',
    email: 'john.d@example.com',
    trackingNumber: 'JM456',
    contents: 'Sneakers and T-shirts',
    weight: '4.5 lbs',
    status: 'Pre-Alert',
    invoiceUrl: '#',
  },
  {
    id: 2,
    user: 'Jane Smith',
    email: 'jane.s@example.com',
    trackingNumber: 'JM789',
    contents: 'Laptop and accessories',
    weight: '8.2 lbs',
    status: 'Pre-Alert',
    invoiceUrl: '#',
  },
    {
    id: 3,
    user: 'Carlos Garcia',
    email: 'carlos.g@example.com',
    trackingNumber: 'JM101',
    contents: 'Books and stationery',
    weight: '12.0 lbs',
    status: 'Pre-Alert',
    invoiceUrl: '#',
  },
];

export default function PreAlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pre-Alerts</h1>
        <p className="text-muted-foreground">
          View incoming package submissions from customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Received Pre-Alerts</CardTitle>
          <CardDescription>
            This is a list of all packages submitted by shippers in Florida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preAlerts.length > 0 ? (
                preAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="font-medium">{alert.user}</div>
                      <div className="text-sm text-muted-foreground">{alert.email}</div>
                    </TableCell>
                    <TableCell className="font-mono">{alert.trackingNumber}</TableCell>
                    <TableCell>{alert.contents}</TableCell>
                    <TableCell>{alert.weight}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <a href={alert.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No pre-alerts received yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
