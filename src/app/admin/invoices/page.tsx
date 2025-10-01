
'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  PlusCircle,
  ArrowLeft,
  Download,
  FileText,
  Trash2,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

const initialInvoices = [
  {
    invoiceId: 'INV-001',
    customerName: 'Bob Marley',
    date: '2024-07-28',
    amount: 67.50,
    status: 'Paid',
    invoiceUrl: placeholderImages.invoices.inv1.src,
  },
  {
    invoiceId: 'INV-002',
    customerName: 'Alicia Keys',
    date: '2024-07-29',
    amount: 120.00,
    status: 'Unpaid',
    invoiceUrl: placeholderImages.invoices.inv2.src,
  },
];

type Invoice = typeof initialInvoices[0];

const initialLineItems = [{ description: '', quantity: 1, price: 0 }];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState(initialLineItems);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
  };
  
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...lineItems];
    if(field === 'quantity' || field === 'price') {
        updatedItems[index] = {...updatedItems[index], [field]: Number(value) };
    } else {
        updatedItems[index] = {...updatedItems[index], [field]: value };
    }
    setLineItems(updatedItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => total + item.quantity * item.price, 0);
  };
  
  const handleGenerateInvoice = () => {
    if(!customerName || lineItems.some(item => !item.description || item.price <= 0)) {
        toast({ title: 'Missing Fields', description: 'Please fill in customer name and all line item details.', variant: 'destructive'});
        return;
    }

    const newInvoice: Invoice = {
      invoiceId: `INV-00${invoices.length + 1}`,
      customerName,
      date: invoiceDate,
      amount: calculateTotal(),
      status: 'Unpaid',
      invoiceUrl: placeholderImages.generatedInvoice.src, // Placeholder for generated invoice
    };

    setInvoices([newInvoice, ...invoices]);
    setOpen(false);
    // Reset form
    setCustomerName('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setLineItems(initialLineItems);
    
    toast({ title: 'Invoice Generated', description: `Invoice ${newInvoice.invoiceId} for ${customerName} has been created.`});
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Generate and manage customer invoices.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                    Fill in the details below to generate a new invoice for a customer.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name</Label>
                            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invoiceDate">Invoice Date</Label>
                            <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label>Line Items</Label>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-24">Quantity</TableHead>
                                    <TableHead className="w-32 text-right">Price</TableHead>
                                    <TableHead className="w-32 text-right">Total</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lineItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Input placeholder="Item or service description" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} min="1" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} className="text-right" placeholder="0.00" />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">${(item.quantity * item.price).toFixed(2)}</TableCell>
                                         <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                        </Button>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" onClick={handleGenerateInvoice}>Generate Invoice</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            A list of all generated invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.invoiceId}>
                  <TableCell className="font-mono">{invoice.invoiceId}</TableCell>
                  <TableCell className="font-medium">{invoice.customerName}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'Paid' ? 'outline' : 'destructive'}>
                        {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <FileText className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                         <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Invoice {invoice.invoiceId}</DialogTitle>
                                <DialogDescription>Invoice for {invoice.customerName} dated {invoice.date}.</DialogDescription>
                            </DialogHeader>
                            <div className="relative h-[600px] overflow-hidden rounded-md">
                                <Image 
                                    src={invoice.invoiceUrl} 
                                    alt={`Invoice for ${invoice.invoiceId}`} 
                                    fill
                                    className="object-contain"
                                    data-ai-hint="invoice document"
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" asChild><DialogClose>Close</DialogClose></Button>
                                <Button><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
