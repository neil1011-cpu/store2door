'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, ArrowLeft, PlusCircle, ArrowRight, FileText, Loader2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FinancePage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [ledger, setLedger] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [
            { data: ledgerData, error: ledgerError },
            { data: invoicesData, error: invoicesError }
        ] = await Promise.all([
            supabase.from('financial_ledger').select('*, profiles(full_name)').order('transaction_date', { ascending: false }),
            supabase.from('invoices').select('*, profiles(full_name)').order('created_at', { ascending: false })
        ]);

        if (ledgerError) throw ledgerError;
        if (invoicesError) throw invoicesError;

        setLedger(ledgerData || []);
        setInvoices(invoicesData || []);
    } catch (err: any) {
        console.error('[FINANCE_FETCH_ERROR]', err);
        setError(err.message || 'Failed to retrieve financial records.');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const stats = useMemo(() => {
    const revenue = ledger.filter(l => Number(l.amount) > 0).reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expenses = ledger.filter(l => Number(l.amount) < 0).reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [ledger]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="animate-spin h-10 w-10 text-primary" /><p className="text-xs font-bold uppercase tracking-widest opacity-40">Syncing Ledger...</p></div>;

  if (error) {
      return (
          <div className="max-w-xl mx-auto py-20">
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Registry Sync Failure</AlertTitle>
                  <AlertDescription className="space-y-4">
                      <p>{error}</p>
                      <Button onClick={fetchData} variant="outline" className="w-full">Retry Connection</Button>
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Unified Finance Ledger</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px]">Immutable accounting system from PostgreSQL.</p>
        </div>
        <Button variant="outline" asChild className="font-bold border-2">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-700">Inbound Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black italic tracking-tighter text-green-700">
                    JMD ${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </CardContent>
            <CardFooter className="pb-4">
                <Button variant="ghost" size="sm" asChild className="text-green-700 h-7 text-[10px] font-bold uppercase">
                    <Link href="/admin/finance/revenue">View Breakdown <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
            </CardFooter>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-700">Outbound Expenses</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black italic tracking-tighter text-red-700">
                    JMD ${stats.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </CardContent>
            <CardFooter className="pb-4">
                <Button variant="ghost" size="sm" asChild className="text-red-700 h-7 text-[10px] font-bold uppercase">
                    <Link href="/admin/finance/expenses">View Breakdown <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
            </CardFooter>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Net Standing</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black italic tracking-tighter text-blue-700">
                    JMD ${stats.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-[10px] font-black uppercase">Invoice #</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map(inv => (
                            <TableRow key={inv.id} className="h-16 hover:bg-muted/30 transition-colors">
                                <TableCell className="pl-6">
                                    <p className="font-mono font-bold text-primary">{inv.invoice_number}</p>
                                    <p className="text-[9px] font-medium opacity-40 uppercase">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </TableCell>
                                <TableCell className="uppercase font-bold text-[10px] italic">{inv.profiles?.full_name || 'N/A'}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant={inv.status === 'Paid' ? 'outline' : 'destructive'} className="text-[8px] font-black uppercase italic border-2">
                                        {inv.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {invoices.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-30 italic">No invoices generated.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Immutable Registry History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-[10px] font-black uppercase">Date</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Memo</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ledger.map(entry => (
                            <TableRow key={entry.id} className="h-16 hover:bg-muted/30 transition-colors">
                                <TableCell className="pl-6 text-[10px] font-bold opacity-60">{new Date(entry.transaction_date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <p className="text-[10px] font-black uppercase italic truncate max-w-[200px]">{entry.description}</p>
                                    <p className="text-[9px] font-bold opacity-40 uppercase">{entry.profiles?.full_name}</p>
                                </TableCell>
                                <TableCell className={cn("text-right pr-6 font-black tracking-tighter text-sm", Number(entry.amount) > 0 ? "text-green-600" : "text-red-600")}>
                                    {Number(entry.amount) > 0 ? '+' : ''}{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {ledger.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-30 italic text-xs">Financial registry is empty.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
