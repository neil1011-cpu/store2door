'use client';

import { useMemo } from 'react';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Invoice } from '@/lib/types';


export default function RevenuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'invoices'), where('status', '==', 'Paid'));
  }, [firestore, user]);
  const { data: revenueData, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const loading = isUserLoading || isLoadingInvoices;

  const totalRevenue = useMemo(() => {
    return revenueData?.reduce((acc, item) => acc + item.amount, 0) || 0;
  }, [revenueData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Breakdown</h1>
          <p className="text-muted-foreground">
            A detailed list of all income transactions from paid invoices.
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
              {revenueData && revenueData.length > 0 ? (
                revenueData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.invoiceId}</TableCell>
                    <TableCell>{item.date ? new Date(item.date.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>{item.lineItems[0]?.description || 'Invoice Payment'}{item.lineItems.length > 1 ? ` and ${item.lineItems.length - 1} more...`: ''}</TableCell>
                    <TableCell><Badge variant="secondary">Invoice</Badge></TableCell>
                    <TableCell className="text-right text-green-500 font-medium">${item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        No paid invoices found.
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
