
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
import { generateInvoiceHtml } from '@/ai/flows/generate-invoice-html';
import type { Invoice, Shipment, UserProfile } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';


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

const initialLineItems = [{ description: '', quantity: 1, price: 0 }];

function InvoiceViewDialog({ invoice, open, onOpenChange }: { invoice: Invoice | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    
    if (!invoice) return null;

    const handleDownloadInvoice = async (invoiceToDownload: Invoice) => {
        if (invoiceToDownload.invoiceUrl.startsWith('data:application/pdf')) {
            const link = document.createElement('a');
            link.href = invoiceToDownload.invoiceUrl;
            link.download = `Invoice-${invoiceToDownload.invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: "Downloading Invoice",
                description: `Your invoice for ${invoiceToDownload.invoiceId} is downloading.`,
            });
        } else {
             toast({ title: 'Not a PDF', description: 'This invoice cannot be downloaded as a PDF.', variant: 'destructive'});
        }
    };

    const isPdf = invoice.invoiceUrl.startsWith('data:application/pdf');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Invoice {invoice.invoiceId}</DialogTitle>
                    <DialogDescription>Invoice for {invoice.customerName} dated {invoice.date ? new Date(invoice.date.toDate()).toLocaleDateString() : 'N/A'}.</DialogDescription>
                </DialogHeader>
                 <div className="relative h-[600px] overflow-hidden rounded-md border">
                    {isPdf ? (
                        <embed src={invoice.invoiceUrl} type="application/pdf" width="100%" height="100%" />
                    ) : (
                         <Image 
                            src={invoice.invoiceUrl} 
                            alt={`Invoice for ${invoice.invoiceId}`} 
                            fill
                            className="object-contain"
                            data-ai-hint="invoice document"
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={() => handleDownloadInvoice(invoice)} disabled={!isPdf}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function FinancePage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [newTransaction, setNewTransaction] = useState({
      type: 'revenue',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState(initialLineItems);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('fullName', 'asc')), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const invoicesQuery = useMemoFirebase(() => query(collection(firestore, 'invoices'), orderBy('date', 'desc')), [firestore]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);


  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...lineItems];
    if(field === 'quantity' || field === 'price') {
        updatedItems[index] = {...updatedItems[index], [field]: Number(value) };
    } else {
        updatedItems[index] = {...updatedItems[index], [field]: value };
    }
    setLineItems(updatedItems);
  };

  const calculateTotal = () => lineItems.reduce((total, item) => total + item.quantity * item.price, 0);
  
  const handleGenerateInvoice = async () => {
    const selectedUser = users?.find(u => u.id === customerId);
    if(!selectedUser || lineItems.some(item => !item.description || item.price <= 0)) {
        toast({ title: 'Missing Fields', description: 'Please select a customer and fill in all line item details.', variant: 'destructive'});
        return;
    }
    
    setIsGenerating(true);

    try {
        const invoiceId = `INV-${Date.now()}`;
        const totalAmount = calculateTotal();
        const customerName = selectedUser.fullName;

        const { html } = await generateInvoiceHtml({
            invoiceId,
            customerName,
            invoiceDate,
            lineItems,
            totalAmount,
        });

        const pdfResponse = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html }),
        });

        if (!pdfResponse.ok) {
            throw new Error('Failed to generate PDF.');
        }

        const { pdf: pdfDataUri } = await pdfResponse.json();

        const newInvoice: Omit<Invoice, 'id'> = {
          invoiceId,
          customerId: selectedUser.id,
          customerName,
          date: serverTimestamp(),
          amount: totalAmount,
          status: 'Unpaid',
          lineItems,
          invoiceUrl: pdfDataUri,
        };
        
        const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
        setDocumentNonBlocking(invoiceDocRef, newInvoice, { merge: true });
        
        setIsCreateOpen(false);
        setCustomerId('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setLineItems(initialLineItems);
        
        toast({ title: 'Invoice Generation Queued', description: `Invoice ${newInvoice.invoiceId} for ${customerName} will be created.`});

        // We can't view it right away as it's a non-blocking update
        // The UI will update automatically via the useCollection hook
        // setSelectedInvoice(newInvoice);
        // setIsViewOpen(true);

    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast({ title: 'Invoice Generation Failed', description: (error as Error).message, variant: 'destructive'});
    } finally {
        setIsGenerating(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  }

  const handleUpdateInvoiceStatus = (invoiceId: string, status: 'Paid' | 'Unpaid') => {
    const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
    updateDocumentNonBlocking(invoiceDocRef, { status });

    toast({
        title: "Invoice Status Update Queued",
        description: `Invoice ${invoiceId} will be marked as ${status}.`
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
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Fill in the details below to generate a new invoice for a customer.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="grid gap-6 py-4 px-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerName">Customer Name</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger id="customerName" disabled={isLoadingUsers}>
                                        <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select a customer"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users?.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label htmlFor="invoiceDate">Invoice Date</Label><Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
                        </div>
                        <div className="space-y-4">
                            <Label>Line Items</Label>
                            <div className="relative w-full overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="w-24">Qty</TableHead><TableHead className="w-32 text-right">Price</TableHead><TableHead className="w-32 text-right">Total</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {lineItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Input placeholder="Item or service description" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} /></TableCell>
                                                <TableCell><Input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} min="1" /></TableCell>
                                                <TableCell><Input type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} className="text-right" placeholder="0.00" /></TableCell>
                                                <TableCell className="text-right font-medium">${(item.quantity * item.price).toFixed(2)}</TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Line Item</Button>
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right"><p className="text-muted-foreground">Total Amount</p><p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p></div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" onClick={handleGenerateInvoice} disabled={isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isGenerating ? 'Generating...' : 'Generate Invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {isLoadingInvoices && <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>}
                {!isLoadingInvoices && invoices?.map((invoice) => (
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
                ))}
                {!isLoadingInvoices && invoices?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No invoices found.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <InvoiceViewDialog invoice={selectedInvoice} open={isViewOpen} onOpenChange={setIsViewOpen} />
    </div>
  );
}
