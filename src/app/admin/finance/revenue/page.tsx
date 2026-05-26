
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
import { ArrowLeft, Loader2, ShoppingCart, FileText, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';


export default function RevenuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // LINKED FINANCE: Pull all revenue movements from the transaction ledger
  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'transactions'), where('type', '==', 'revenue'), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: revenueTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const loading = isUserLoading || isLoadingTransactions;

  const totalRevenue = useMemo(() => {
    return revenueTransactions?.reduce((acc, item) => acc + item.amount, 0) || 0;
  }, [revenueTransactions]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Worldwide Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Ledger</h1>
          <p className="text-muted-foreground">
            Complete income history from POS, Manual, and Administrative paths.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/finance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finance
          </Link>
        </Button>
      </div>
      
      <Card className="border-t-4 border-t-green-500 shadow-lg">
        <CardHeader>
          <CardTitle>Inbound Cash Flow</CardTitle>
          <CardDescription>
            Total Authorized Revenue: <span className="font-black text-green-600 text-xl tracking-tighter">JMD ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Type</TableHead>
                <TableHead>Date Logged</TableHead>
                <TableHead>Description / Memo</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueTransactions && revenueTransactions.length > 0 ? (
                revenueTransactions.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="pl-6">
                        {item.source === 'POS' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px] font-bold">
                                <ShoppingCart className="h-2 w-2 mr-1" /> POS Hub
                            </Badge>
                        ) : item.source?.includes('Manual') ? (
                             <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] font-bold">
                                <PlusCircle className="h-2 w-2 mr-1" /> Manual
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px] font-bold">
                                <FileText className="h-2 w-2 mr-1" /> External
                            </Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                        {item.date ? (item.date.toDate ? item.date.toDate().toLocaleString() : new Date(item.date).toLocaleString()) : 'N/A'}
                    </TableCell>
                    <TableCell>
                        <div className="font-bold text-sm">{item.description}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[250px]">{item.id}</div>
                    </TableCell>
                    <TableCell>
                        <span className="text-xs font-black uppercase italic opacity-60">{(item as any).method || 'System'}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6 text-green-600 font-black text-lg tracking-tighter">
                        JMD ${item.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-48 text-muted-foreground italic">
                        No worldwide revenue records detected in the ledger.
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
