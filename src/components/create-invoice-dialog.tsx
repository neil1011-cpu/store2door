
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
import { generateInvoiceHtml } from '@/ai/flows/generate-invoice-html';
import type { Invoice, UserProfile } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const initialLineItems = [{ description: '', quantity: 1, price: 0 }];

type CreateInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  preselectedUser?: UserProfile;
  onInvoiceCreated: (invoice: Invoice) => void;
};

// This function creates a new browser tab and renders the HTML for the invoice.
// It includes a button to trigger the browser's print dialog.
const openPrintableInvoice = (htmlContent: string) => {
  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head>
          <title>Print Invoice</title>
          <style>
            @media print {
              #print-button { display: none; }
              @page { margin: 0; }
              body { margin: 1.6cm; }
            }
            body { font-family: sans-serif; }
            .print-controls { position: fixed; top: 1rem; right: 1rem; z-index: 100; }
            .print-button {
                background-color: #007bff; color: white; border: none;
                padding: 10px 20px; border-radius: 5px; cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
          </style>
        </head>
        <body>
          <div class="print-controls">
            <button id="print-button" class="print-button" onclick="window.print()">Print to PDF</button>
          </div>
          ${htmlContent}
        </body>
      </html>
    `);
    newWindow.document.close();
  }
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

      const { html } = await generateInvoiceHtml({
        invoiceId,
        customerName,
        invoiceDate,
        lineItems,
        totalAmount,
      });

      // Instead of generating a PDF on the server, open the HTML in a new tab for printing.
      openPrintableInvoice(html);
      
      const newInvoiceData = {
        invoiceId,
        customerId: selectedUser.id,
        customerName,
        date: serverTimestamp(),
        amount: totalAmount,
        status: 'Unpaid' as 'Unpaid',
        lineItems,
        invoiceUrl: 'about:blank', // The invoice is now generated on the client
      };

      const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
      await setDoc(invoiceDocRef, newInvoiceData);

      toast({ title: 'Invoice Ready to Print', description: `Invoice ${invoiceId} has been opened in a new tab.` });
      
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
  );
}
