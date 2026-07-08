'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, UserProfile, LineItem } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const generateInvoiceHtml = (invoiceData: {
  invoiceId: string;
  customerName: string;
  invoiceDate: string;
  lineItems: LineItem[];
  totalAmount: number;
}): string => {
  const { invoiceId, customerName, invoiceDate, lineItems, totalAmount } = invoiceData;

  const lineItemsHtml = lineItems
    .map(
      (item) => `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">JMD $${item.price.toFixed(2)}</td>
      <td class="text-right">JMD $${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
        .container { max-width: 800px; margin: 40px auto; padding: 30px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; color: #0d6efd; }
        .header .company-details { text-align: right; }
        .header .company-details p { margin: 0; font-size: 0.9em; color: #6c757d; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .invoice-details .bill-to p { margin: 0; }
        .invoice-details .invoice-meta { text-align: right; }
        .invoice-details .invoice-meta p { margin: 0; }
        .invoice-details .invoice-meta .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 15px; border-bottom: 1px solid #dee2e6; }
        thead th { background-color: #e9ecef; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-section { margin-top: 30px; text-align: right; }
        .total-section table { width: auto; margin-left: auto; }
        .total-section th, .total-section td { border: none; padding: 8px 15px; }
        .total-section .grand-total { font-size: 1.4em; font-weight: bold; color: #0d6efd; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; font-size: 0.9em; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>INVOICE</h1>
          <div class="company-details">
            <p style="font-weight: bold; font-size: 1.2em;">FromStore2Door</p>
            <p>3507 NW 19th ST</p>
            <p>Lauderdale Lake, FL, 33311-4224</p>
            <p>info@fromstore2door.com</p>
          </div>
        </div>
        <div class="invoice-details">
          <div class="bill-to">
            <p style="color: #6c757d; margin-bottom: 5px;">BILL TO</p>
            <p style="font-weight: bold; font-size: 1.2em;">${customerName}</p>
          </div>
          <div class="invoice-meta">
            <p><span class="label">Invoice #:</span> ${invoiceId}</p>
            <p><span class="label">Date:</span> ${new Date(invoiceDate).toLocaleDateString()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        <div class="total-section">
          <table>
            <tr>
              <td class="label">Total:</td>
              <td class="grand-total">JMD $${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const initialLineItems = [{ description: '', quantity: 1, price: 0 }];

type CreateInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  preselectedUser?: UserProfile;
  onInvoiceCreated: (invoice: Invoice) => void;
};


export function CreateInvoiceDialog({
  open,
  onOpenChange,
  users,
  preselectedUser,
  onInvoiceCreated,
}: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [customerId, setCustomerId] = useState(preselectedUser?.id || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState(initialLineItems);
  
  // Effect to reset state when dialog closes or preselected user changes
  useEffect(() => {
    if (!open) {
        // Reset form when dialog is closed
        setCustomerId(preselectedUser?.id || '');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setLineItems(initialLineItems);
        setIsGenerating(false);
    } else {
        // When dialog opens, ensure preselected user is set
        setCustomerId(preselectedUser?.id || '');
    }
}, [open, preselectedUser]);


  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...lineItems];
    if (field === 'quantity' || field === 'price') {
      updatedItems[index] = { ...updatedItems[index], [field]: Number(value) };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value as string };
    }
    setLineItems(updatedItems);
  };

  const calculateTotal = () => lineItems.reduce((total, item) => total + item.quantity * item.price, 0);

  const handleGenerateInvoice = async () => {
    const selectedUser = users.find(u => u.id === customerId);
    if (!selectedUser || lineItems.some(item => !item.description || item.price <= 0)) {
      toast({ title: 'Missing Fields', description: 'Please select a customer and fill in all line item details.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);

    try {
      const invoiceId = `INV-${Date.now()}`;
      const totalAmount = calculateTotal();
      const customerName = selectedUser.fullName;

      const html = generateInvoiceHtml({
        invoiceId,
        customerName,
        invoiceDate,
        lineItems,
        totalAmount,
      });
      
      const newInvoiceData = {
        invoiceId,
        customerId: selectedUser.id,
        customerName,
        date: serverTimestamp(),
        amount: totalAmount,
        status: 'Unpaid' as 'Unpaid',
        lineItems,
        invoiceUrl: html, // Save the generated HTML to Firestore
      };

      const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
      await setDoc(invoiceDocRef, newInvoiceData);

      toast({ title: 'Invoice Generated', description: `Invoice ${invoiceId} has been created and saved.` });
      
      // The onInvoiceCreated callback is used to notify the parent (finance page)
      // that a new invoice exists so it can refresh its list.
      onInvoiceCreated({ ...newInvoiceData, id: invoiceId, date: new Date() });
      onOpenChange(false); // Close dialog

    } catch (error) {
      console.error("Invoice Generation Error:", error);
       if ((error as Error).message.includes('permission-denied')) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `invoices/INV-${Date.now()}`, // Approximate path
                operation: 'create',
                requestResourceData: { customerId, amount: calculateTotal() },
            }));
        } else {
            toast({ title: 'Invoice Generation Failed', description: (error as Error).message, variant: 'destructive' });
        }
    } finally {
      setIsGenerating(false);
    }
  };
  
   return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                            <Select value={customerId} onValueChange={setCustomerId} disabled={!!preselectedUser}>
                                <SelectTrigger id="customerName">
                                    <SelectValue placeholder={"Select a customer"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
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
                                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="w-24">Qty</TableHead><TableHead className="text-right">Price (JMD)</TableHead><TableHead className="text-right">Total (JMD)</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {lineItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Input placeholder="Item or service description" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} min="1" /></TableCell>
                                            <TableCell><Input type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} className="text-right" placeholder="0.00" /></TableCell>
                                            <TableCell className="text-right font-medium">JMD ${(item.quantity * item.price).toFixed(2)}</TableCell>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Line Item</Button>
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right"><p className="text-muted-foreground">Total Amount (JMD)</p><p className="text-2xl font-bold">JMD ${calculateTotal().toFixed(2)}</p></div>
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
  );
}
