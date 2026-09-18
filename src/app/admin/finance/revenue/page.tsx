'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RevenuePage() {
  const { supabase } = useSupabase();
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const { data, error: fetchError } = await supabase
              .from('financial_ledger')
              .select('*, profiles(full_name)')
              .gt('amount', 0)
              .order('transaction_date', { ascending: false });
          
          if (fetchError) throw fetchError;
          setLedger(data || []);
      } catch (err: any) {
          console.error('[REVENUE_FETCH_ERROR]', err);
          setError(err.message || 'Unauthorized access to registry.');
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchRevenue();
  }, [supabase]);

  const totalRevenue = useMemo(() => {
    return ledger.reduce((acc, item) => acc + Number(item.amount), 0);
  }, [ledger]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center flex-col gap-4 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Verifying Inflow Records...</p></div>;
  }

  if (error) {
      return (
          <div className="max-w-xl mx-auto py-20">
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ledger Sync Failure</AlertTitle>
                  <AlertDescription className="space-y-4 pt-2">
                      <p className="text-xs">{error}</p>
                      <Button onClick={fetchRevenue} variant="outline" size="sm" className="w-full">Retry Authorization</Button>
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-green-600">Revenue Ledger</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] mt-1">Universal income history from PostgreSQL.</p>
        </div>
        <Button variant="outline" asChild className="font-bold border-2">
          <Link href="/admin/finance"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Finance</Link>
        </Button>
      </div>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-green-50 dark:bg-green-950/20 border-b border-green-100 dark:border-green-900">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" /> Authorized Inflow
            </CardTitle>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-60">Total Revenue Collected</p>
                <p className="text-2xl font-black italic text-green-600 tracking-tighter">JMD ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6 text-[10px] font-black uppercase">Transaction Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Source / Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Customer Profile</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length > 0 ? (
                ledger.map((item) => (
                    <TableRow key={item.id} className="h-20 hover:bg-green-50/10 transition-colors">
                        <TableCell className="pl-6 text-[10px] font-medium opacity-60">{new Date(item.transaction_date).toLocaleString()}</TableCell>
                        <TableCell>
                            <p className="font-bold text-sm uppercase italic">{(item.transaction_type || 'payment').replace(/_/g, ' ')}</p>
                            <p className="text-[9px] font-medium opacity-40 uppercase line-clamp-1">{item.description}</p>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase italic">{item.profiles?.full_name || 'Registry Entry'}</TableCell>
                        <TableCell className="text-right pr-6 text-green-600 font-black text-lg tracking-tighter">
                            + JMD ${Number(item.amount).toFixed(2)}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-64 text-muted-foreground italic opacity-30">No revenue records found in registry.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
