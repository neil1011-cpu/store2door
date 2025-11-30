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
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Invoice, Transaction } from '@/lib/types';


export default function RevenuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'invoices'), where('status', '==', 'Paid'));
  }, [firestore, user]);
  const { data: paidInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'transactions'), where('type', '==', 'revenue'), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: manualRevenue, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const loading = isUserLoading || isLoadingInvoices || isLoadingTransactions;

  const combinedRevenue = useMemo(() => {
    const invoiceRevenue = paidInvoices?.map(item => ({
        id: item.id,
        date: item.date,
        description: `Invoice ${item.invoiceId} - ${item.customerName}`,
        amount: item.amount,
        type: 'Invoice'
    })) || [];
    
    const manualRevenueFormatted = manualRevenue?.map(item => ({
        id: item.id,
        date: item.date,
        description: item.description,
        amount: item.amount,
        type: 'Manual'
    })) || [];

    return [...invoiceRevenue, ...manualRevenueFormatted].sort((a,b) => b.date.toDate() - a.date.toDate());
  }, [paidInvoices, manualRevenue]);

  const totalRevenue = useMemo(() => {
    return combinedRevenue.reduce((acc, item) => acc + item.amount, 0);
  }, [combinedRevenue]);

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
            A detailed list of all income transactions from paid invoices and manual entries.
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
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedRevenue && combinedRevenue.length > 0 ? (
                combinedRevenue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.id.substring(0, 10)}...</TableCell>
                    <TableCell>{item.date ? new Date(item.date.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
                    <TableCell className="text-right text-green-500 font-medium">${item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No revenue recorded yet.
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
