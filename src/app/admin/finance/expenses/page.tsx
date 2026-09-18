'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, TrendingDown, History, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ExpensesPage() {
  const { supabase } = useSupabase();
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const { data, error: fetchError } = await supabase
              .from('financial_ledger')
              .select('*, profiles(full_name)')
              .lt('amount', 0)
              .order('transaction_date', { ascending: false });
          
          if (fetchError) throw fetchError;
          setLedger(data || []);
      } catch (err: any) {
          console.error('[EXPENSES_FETCH_ERROR]', err);
          setError(err.message || 'Access to outflow registry denied.');
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchExpenses();
  }, [supabase]);

  const totalExpenses = useMemo(() => {
    return ledger.reduce((acc, item) => acc + Math.abs(Number(item.amount)), 0);
  }, [ledger]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center flex-col gap-4 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Verifying Outflow Records...</p></div>;
  }

  if (error) {
      return (
          <div className="max-w-xl mx-auto py-20">
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Outflow Sync Failure</AlertTitle>
                  <AlertDescription className="space-y-4 pt-2">
                      <p className="text-xs">{error}</p>
                      <Button onClick={fetchExpenses} variant="outline" size="sm" className="w-full">Retry Authorization</Button>
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-red-600">Expense Audit</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] mt-1">Official outflow ledger from PostgreSQL.</p>
        </div>
        <Button variant="outline" asChild className="font-bold border-2">
          <Link href="/admin/finance"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Finance</Link>
        </Button>
      </div>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" /> Authorized Outflow
            </CardTitle>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-60">Total Disbursed</p>
                <p className="text-2xl font-black italic text-red-600 tracking-tighter">JMD ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6 text-[10px] font-black uppercase">Transaction Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Description / Memo</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Target Account</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length > 0 ? (
                ledger.map((item) => (
                    <TableRow key={item.id} className="h-20 hover:bg-red-50/10 transition-colors">
                        <TableCell className="pl-6 text-[10px] font-medium opacity-60">{new Date(item.transaction_date).toLocaleString()}</TableCell>
                        <TableCell>
                            <p className="font-bold text-sm uppercase italic">{item.description}</p>
                            <p className="text-[9px] font-mono opacity-40 uppercase">Ref: {item.id.slice(0, 8)}</p>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase italic">{item.profiles?.full_name || 'System'}</TableCell>
                        <TableCell className="text-right pr-6 text-red-600 font-black text-lg tracking-tighter">
                            JMD ${Math.abs(Number(item.amount)).toFixed(2)}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-64 text-muted-foreground italic opacity-30">No expense records found in registry.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
