
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { ArrowUpRight, DollarSign, ArrowLeft, PlusCircle, ArrowRight, Download, FileText, Trash2, Receipt, Loader2, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { FinanceChart } from '@/components/finance-chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import type { Invoice, Shipment, UserProfile, Transaction } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, setDoc, updateDoc, addDoc, where, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { CreateInvoiceDialog } from '@/components/create-invoice-dialog';


function InvoiceViewDialog({ invoice, open, onOpenChange }: { invoice: Invoice | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    
    if (!invoice) return null;

    const handlePrintInvoice = () => {
        const iframe = document.getElementById('invoice-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } else {
            toast({ title: 'Could not print invoice', description: 'There was an issue finding the invoice content to print.', variant: 'destructive'});
        }
    };

    const isPrintable = invoice.invoiceUrl && invoice.invoiceUrl.startsWith('<!DOCTYPE html>');
    
    const displayDate = invoice.date && typeof (invoice.date as any).toDate === 'function' 
        ? new Date((invoice.date as any).toDate()).toLocaleDateString()
        : (invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Invoice {invoice.invoiceId}</DialogTitle>
                    <DialogDescription>Invoice for {invoice.customerName} dated {displayDate}.</DialogDescription>
                </DialogHeader>
                 <div className="relative h-[600px] overflow-hidden rounded-md border">
                    <iframe 
                        id="invoice-iframe"
                        srcDoc={invoice.invoiceUrl}
                        title={`Invoice ${invoice.invoiceId}`}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handlePrintInvoice} disabled={!isPrintable}><Download className="mr-2 h-4 w-4" /> Print to PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function FinancePage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [newTransaction, setNewTransaction] = useState({
      type: 'expense' as 'revenue' | 'expense',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), orderBy('fullName', 'asc'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'invoices'), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'transactions'), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const loading = isUserLoading || isLoadingUsers || isLoadingInvoices || isLoadingTransactions;

  // LINKED FINANCE CALCULATIONS: Source of truth for revenue is the transactions collection.
  const financeSummary = useMemo(() => {
    const revenueTransactions = transactions?.filter(t => t.type === 'revenue') || [];
    const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];

    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    const monthlyData: { [key: string]: { month: string, revenue: number, expenses: number, profit: number } } = {};

    transactions?.forEach(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (!date || isNaN(date.getTime())) return;

      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
       if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0, profit: 0 };
      }

      if (t.type === 'revenue') {
        monthlyData[month].revenue += t.amount;
      } else {
        monthlyData[month].expenses += t.amount;
      }
    });
    
    for (const month in monthlyData) {
        monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
    }

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      chartData: Object.values(monthlyData).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime()),
    };
  }, [transactions]);


  const handleInvoiceCreated = (invoice: Invoice) => {
    setIsCreateOpen(false);
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  }
  

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  }

  const handleUpdateInvoiceStatus = async (inv: Invoice, status: 'Paid' | 'Unpaid') => {
    const batch = writeBatch(firestore);
    const invoiceDocRef = doc(firestore, 'invoices', inv.invoiceId);
    
    batch.update(invoiceDocRef, { status });

    // If marking as Paid, create a linked revenue transaction to update Finance automatically
    if (status === 'Paid') {
        const transactionRef = doc(collection(firestore, 'transactions'));
        batch.set(transactionRef, {
            type: 'revenue',
            source: 'Manual (Admin)',
            amount: inv.amount,
            description: `Invoice Payment - ${inv.customerName} (${inv.invoiceId})`,
            date: serverTimestamp(),
            method: 'Manual Update',
            customerId: inv.customerId,
            invoiceIds: [inv.invoiceId]
        });
    }

    try {
        await batch.commit();
        toast({
            title: "Invoice Status Updated",
            description: `Invoice ${inv.invoiceId} marked as ${status} and logged in Finance.`
        });
    } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: invoiceDocRef.path,
            operation: 'update',
            requestResourceData: { status },
        }));
    }
  }

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a description and an amount.',
            variant: 'destructive',
        });
        return;
    }
    setIsAddingTransaction(true);

    const transactionCollectionRef = collection(firestore, 'transactions');
    const transactionToAdd = {
        ...newTransaction,
        source: 'Manual Entry',
        amount: parseFloat(newTransaction.amount),
        date: new Date(newTransaction.date)
    };

    try {
        await addDoc(transactionCollectionRef, transactionToAdd);
        toast({
            title: 'Transaction Added!',
            description: `A new ${newTransaction.type} of JMD $${newTransaction.amount} has been recorded.`,
        });
        setNewTransaction({ type: 'expense', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: transactionCollectionRef.path,
            operation: 'create',
            requestResourceData: transactionToAdd,
        }));
    } finally {
        setIsAddingTransaction(false);
    }
  };

  if (loading || !users || !invoices) {
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
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground">
            Universal ledger synchronized with POS, Manual, and Hub systems.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/finance/revenue">
            <Card className="hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue (JMD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">JMD ${financeSummary.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center">From all recorded payments</p>
              </CardContent>
               <CardFooter><p className="text-xs text-muted-foreground flex items-center">View breakdown <ArrowRight className="h-4 w-4 ml-1" /></p></CardFooter>
            </Card>
        </Link>
        <Link href="/admin/finance/expenses">
            <Card className="hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses (JMD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">JMD ${financeSummary.expenses.toLocaleString()}</div>
                 <p className="text-xs text-muted-foreground flex items-center">From warehouse and ops costs</p>
              </CardContent>
               <CardFooter><p className="text-xs text-muted-foreground flex items-center">View breakdown <ArrowRight className="h-4 w-4 ml-1" /></p></CardFooter>
            </Card>
        </Link>
        <Link href="/admin/finance">
            <Card className="hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Profit (JMD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">JMD ${financeSummary.profit.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center">Real-time worldwide summary</p>
              </CardContent>
               <CardFooter><p className="text-xs text-muted-foreground flex items-center">View breakdown <ArrowRight className="h-4 w-4 ml-1" /></p></CardFooter>
            </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Overview</CardTitle>
                    <CardDescription>Ledger performance over the last few months.</CardDescription>
                </CardHeader>
                <CardContent>
                    {financeSummary.chartData.length > 0 ? (
                        <FinanceChart data={financeSummary.chartData} />
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground italic">
                            No ledger records found to populate charts.
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Breakdown</CardTitle>
                    <CardDescription>Fiscal data extracted from the global transactions ledger.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <Table>
                        <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {financeSummary.chartData.length > 0 ? (
                                financeSummary.chartData.map((item) => (
                                <TableRow key={item.month}>
                                    <TableCell className="font-medium">{item.month}</TableCell>
                                    <TableCell className="text-right text-green-500 font-bold">JMD ${item.revenue.toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-red-500">JMD ${item.expenses.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-black italic tracking-tighter">JMD ${item.profit.toLocaleString()}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">Waiting for worldwide data sync...</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct Ledger Entry</CardTitle>
              <CardDescription>Manually record non-invoice movements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="tx-type">Category</Label>
                  <Select value={newTransaction.type} onValueChange={(value: 'revenue' | 'expense') => setNewTransaction({...newTransaction, type: value})}>
                      <SelectTrigger id="tx-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent><SelectItem value="revenue">Revenue (Income)</SelectItem><SelectItem value="expense">Expense (Cost)</SelectItem></SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-desc">Memo</Label>
                  <Input id="tx-desc" placeholder="e.g., Office Rent, Agent Commission" value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-amount">Amount (JMD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-40">JMD $</span>
                    <Input id="tx-amount" type="number" placeholder="0.00" value={newTransaction.amount} onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})} className="pl-14" />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-date">Value Date</Label>
                  <Input id="tx-date" type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddTransaction} disabled={isAddingTransaction} className="w-full">
                {isAddingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Post to Ledger
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>Generate customer invoices and synchronize status with Finance.</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24 italic text-muted-foreground">No invoices generated yet.</TableCell></TableRow>
                ) : (
                    invoices.map((invoice) => (
                        <TableRow key={invoice.invoiceId}>
                        <TableCell className="font-mono font-bold">{invoice.invoiceId}</TableCell>
                        <TableCell className="font-medium">{invoice.customerName}</TableCell>
                        <TableCell>{invoice.date ? (invoice.date.toDate ? invoice.date.toDate().toLocaleDateString() : new Date(invoice.date).toLocaleDateString()) : 'N/A'}</TableCell>
                        <TableCell className="font-black">JMD ${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={invoice.status === 'Paid' ? 'outline' : 'destructive'}>{invoice.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">More actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice, 'Paid')} disabled={invoice.status === 'Paid'}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice, 'Unpaid')} disabled={invoice.status === 'Unpaid'}>
                                        <Receipt className="mr-2 h-4 w-4" />
                                        Mark as Unpaid
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <CreateInvoiceDialog 
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        users={users || []}
        onInvoiceCreated={handleInvoiceCreated}
      />
      <InvoiceViewDialog invoice={selectedInvoice} open={isViewOpen} onOpenChange={setIsViewOpen} />
    </div>
  );
}
