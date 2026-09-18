
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, TrendingDown, History } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';

export default function ExpensesPage() {
  const { supabase } = useSupabase();
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
        setIsLoading(true);
        // Expenses are negative amounts in the hardened ledger
        const { data } = await supabase
            .from('financial_ledger')
            .select('*, profiles(full_name)')
            .lt('amount', 0)
            .order('transaction_date', { ascending: false });
        
        setLedger(data || []);
        setIsLoading(false);
    };
    fetchExpenses();
  }, [supabase]);

  const totalExpenses = useMemo(() => {
    return ledger.reduce((acc, item) => acc + Math.abs(Number(item.amount)), 0);
  }, [ledger]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
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
        <CardHeader className="bg-red-50 dark:bg-red-950/20 border-b border-red-100">
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
                            <p className="text-[9px] font-mono opacity-40 uppercase">Ref: {item.id}</p>
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase">{item.profiles?.full_name || 'System'}</TableCell>
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
