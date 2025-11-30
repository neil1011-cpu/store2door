
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
import type { Invoice, Shipment, UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { CreateInvoiceDialog } from '@/components/create-invoice-dialog';


const financeData = {
  summary: {
    revenue: 45231.89,
    expenses: 21789.45,
    profit: 23442.44,
    revenueChange: 20.1,
    expensesChange: 12.2,
    profitChange: 28.3,
  },
  breakdown: [
    { month: 'April', revenue: 12000, expenses: 7000, profit: 5000 },
    { month: 'May', revenue: 15500, expenses: 8200, profit: 7300 },
    { month: 'June', revenue: 17731.89, expenses: 6589.45, profit: 11142.44 },
  ],
};


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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Invoice {invoice.invoiceId}</DialogTitle>
                    <DialogDescription>Invoice for {invoice.customerName} dated {invoice.date ? new Date(invoice.date.toDate()).toLocaleDateString() : 'N/A'}.</DialogDescription>
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
      type: 'revenue',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  const usersQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, 'users'), orderBy('fullName', 'asc')), [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const invoicesQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, 'invoices'), orderBy('date', 'desc')), [firestore, user]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const loading = isUserLoading || isLoadingUsers || isLoadingInvoices;

  const handleInvoiceCreated = (invoice: Invoice) => {
    setIsCreateOpen(false);
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  }
  

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  }

  const handleUpdateInvoiceStatus = (invoiceId: string, status: 'Paid' | 'Unpaid') => {
    const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
    updateDoc(invoiceDocRef, { status })
        .then(() => {
            toast({
                title: "Invoice Status Updated",
                description: `Invoice ${invoiceId} marked as ${status}.`
            });
        })
        .catch(error => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: invoiceDocRef.path,
                operation: 'update',
                requestResourceData: { status },
            }));
        });
  }

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a description and an amount.',
            variant: 'destructive',
        });
        return;
    }
    // In a real app, this would be an API call to a 'transactions' collection
    toast({
        title: 'Transaction Added',
        description: `A new ${newTransaction.type} of $${newTransaction.amount} has been recorded.`,
    });
    setNewTransaction({ type: 'revenue', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
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
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            View your financial statements, transactions, and invoices.
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financeData.summary.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center"><ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />+{financeData.summary.revenueChange}% from last quarter</p>
              </CardContent>
               <CardFooter><p className="text-xs text-muted-foreground flex items-center">View breakdown <ArrowRight className="h-4 w-4 ml-1" /></p></CardFooter>
            </Card>
        </Link>
        <Link href="/admin/finance/expenses">
            <Card className="hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financeData.summary.expenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center"><ArrowUpRight className="h-4 w-4 mr-1 text-red-500" />+{financeData.summary.expensesChange}% from last quarter</p>
              </CardContent>
               <CardFooter><p className="text-xs text-muted-foreground flex items-center">View breakdown <ArrowRight className="h-4 w-4 ml-1" /></p></CardFooter>
            </Card>
        </Link>
        <Link href="/admin/finance">
            <Card className="hover:bg-accent transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financeData.summary.profit.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center"><ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />+{financeData.summary.profitChange}% from last quarter</p>
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
                    <CardDescription>Revenue vs. Expenses over the last 3 months.</CardDescription>
                </CardHeader>
                <CardContent><FinanceChart data={financeData.breakdown} /></CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                    <CardDescription>Monthly financial data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <Table>
                        <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {financeData.breakdown.map((item) => (
                            <TableRow key={item.month}>
                                <TableCell className="font-medium">{item.month}</TableCell>
                                <TableCell className="text-right text-green-500">${item.revenue.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-500">${item.expenses.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold">${item.profit.toLocaleString()}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Transaction</CardTitle>
              <CardDescription>Manually record a new transaction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="tx-type">Transaction Type</Label>
                  <Select value={newTransaction.type} onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}>
                      <SelectTrigger id="tx-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent><SelectItem value="revenue">Revenue</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-desc">Description</Label>
                  <Input id="tx-desc" placeholder="e.g., Shipping supplies" value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-amount">Amount (USD)</Label>
                  <Input id="tx-amount" type="number" placeholder="e.g., 150.00" value={newTransaction.amount} onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tx-date">Date</Label>
                  <Input id="tx-date" type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddTransaction}><PlusCircle className="mr-2 h-4 w-4" />Add Transaction</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>Generate and manage customer invoices.</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">No invoices found.</TableCell></TableRow>
                ) : (
                    invoices.map((invoice) => (
                        <TableRow key={invoice.invoiceId}>
                        <TableCell className="font-mono">{invoice.invoiceId}</TableCell>
                        <TableCell className="font-medium">{invoice.customerName}</TableCell>
                        <TableCell>{invoice.date ? new Date(invoice.date.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
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
                                    <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice.invoiceId, 'Paid')} disabled={invoice.status === 'Paid'}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice.invoiceId, 'Unpaid')} disabled={invoice.status === 'Unpaid'}>
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

    