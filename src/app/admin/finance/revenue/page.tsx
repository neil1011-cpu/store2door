
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const revenueData = [
  { id: 'REV001', date: '2024-06-25', customer: 'Bob Marley', description: 'Shipping Fee - JM789', amount: 45.50, type: 'Shipping' },
  { id: 'REV002', date: '2024-06-24', customer: 'Alicia Keys', description: 'Customs Fee - JM101', amount: 120.00, type: 'Customs' },
  { id: 'REV003', date: '2024-06-23', customer: 'John Legend', description: 'Shipping Fee - JM112', amount: 30.00, type: 'Shipping' },
  { id: 'REV004', date: '2024-06-22', customer: 'Rihanna Fenty', description: 'Personal Shopping Service', amount: 50.00, type: 'Service' },
  { id: 'REV005', date: '2024-06-21', customer: 'Drake Graham', description: 'Shipping Fee - JM113', amount: 85.00, type: 'Shipping' },
];

export default function RevenuePage() {
  const totalRevenue = revenueData.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Breakdown</h1>
          <p className="text-muted-foreground">
            A detailed list of all income transactions.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/finance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finance
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Revenue Transactions</CardTitle>
          <CardDescription>
            Total Revenue: <span className="font-bold text-green-500">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell className="font-medium">{item.customer}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
                  <TableCell className="text-right text-green-500 font-medium">${item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    