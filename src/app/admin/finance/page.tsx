
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, ArrowLeft, PlusCircle, ArrowRight, FileText, Loader2, MoreHorizontal } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function FinancePage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [ledger, setLedger] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        const [
            { data: ledgerData },
            { data: invoicesData }
        ] = await Promise.all([
            supabase.from('financial_ledger').select('*, profiles(full_name)').order('transaction_date', { ascending: false }),
            supabase.from('invoices').select('*, profiles(full_name)').order('created_at', { ascending: false })
        ]);
        setLedger(ledgerData || []);
        setInvoices(invoicesData || []);
        setIsLoading(false);
    };
    fetchData();
  }, [supabase]);

  const stats = useMemo(() => {
    const revenue = ledger.filter(l => Number(l.amount) > 0).reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expenses = ledger.filter(l => Number(l.amount) < 0).reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [ledger]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Finance Ledger</h1>
          <p className="text-muted-foreground">Immutable accounting system replacing Firebase walletBalance.</p>
        </div>
        <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inbound Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">JMD ${stats.revenue.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outbound Expenses</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">JMD ${stats.expenses.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net Standing</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">JMD ${stats.net.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                    {invoices.map(inv => (
                        <TableRow key={inv.id}>
                            <TableCell className="font-mono font-bold">{inv.invoice_number}</TableCell>
                            <TableCell className="uppercase font-bold text-xs">{inv.profiles?.full_name}</TableCell>
                            <TableCell>JMD ${Number(inv.amount).toLocaleString()}</TableCell>
                            <TableCell><Badge variant={inv.status === 'Paid' ? 'outline' : 'destructive'}>{inv.status}</Badge></TableCell>
                        </TableRow>
                    ))}
                    {invoices.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-40">No invoices generated.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Immutable Ledger History</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                    {ledger.map(entry => (
                        <TableRow key={entry.id}>
                            <TableCell className="text-xs">{new Date(entry.transaction_date).toLocaleDateString()}</TableCell>
                            <TableCell className="font-bold text-xs">{entry.profiles?.full_name}</TableCell>
                            <TableCell className="text-xs">{entry.description}</TableCell>
                            <TableCell className={cn("text-right font-black", Number(entry.amount) > 0 ? "text-green-600" : "text-red-600")}>
                                {Number(entry.amount) > 0 ? '+' : ''}{Number(entry.amount).toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                    {ledger.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-40">Financial registry is empty.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
