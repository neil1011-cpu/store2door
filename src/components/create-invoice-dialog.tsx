
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
import type { UserProfile, LineItem } from '@/lib/types';
import { useSupabase } from '@/components/supabase-provider';

const initialLineItems = [{ description: '', quantity: 1, price: 0 }];

type CreateInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  preselectedUser?: any;
  onInvoiceCreated: () => void;
};

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  users,
  preselectedUser,
  onInvoiceCreated,
}: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [isGenerating, setIsGenerating] = useState(false);
  const [customerId, setCustomerId] = useState(preselectedUser?.id || '');
  const [lineItems, setLineItems] = useState(initialLineItems);
  
  useEffect(() => {
    if (!open) {
        setCustomerId(preselectedUser?.id || '');
        setLineItems(initialLineItems);
        setIsGenerating(false);
    } else {
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
      toast({ title: 'Missing Fields', description: 'Complete all line item details.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);

    try {
      const totalAmount = calculateTotal();
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // 1. Create Invoice
      const { data: inv, error: invError } = await supabase.from('invoices').insert({
        profile_id: selectedUser.id,
        amount: totalAmount,
        invoice_number: invoiceNumber,
        status: 'Unpaid'
      }).select().single();

      if (invError) throw invError;

      // 2. Record Debt in Ledger (Trigger will sync profile.wallet_balance)
      const { error: ledgerError } = await supabase.from('financial_ledger').insert({
        profile_id: selectedUser.id,
        amount: -totalAmount,
        transaction_type: 'shipping_fee',
        description: `Invoice Created: ${invoiceNumber}`,
        reference_id: inv.id
      });

      if (ledgerError) throw ledgerError;

      toast({ title: 'Invoice Secured', description: `Invoice ${invoiceNumber} created and client account charged.` });
      onInvoiceCreated();
      onOpenChange(false);

    } catch (error: any) {
      console.error("Invoice Error:", error);
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };
  
   return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Issue Global Invoice</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Generate bill and debit client registry</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-6 py-4 px-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Recipient Selection</Label>
                        <Select value={customerId} onValueChange={setCustomerId} disabled={!!preselectedUser}>
                            <SelectTrigger className="h-12 border-2">
                                <SelectValue placeholder={"Select a customer"} />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="font-bold uppercase text-xs">{user.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Service Line Items</Label>
                        <div className="relative w-full overflow-auto">
                            <Table>
                                <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-[10px] font-black uppercase">Description</TableHead><TableHead className="w-24 text-[10px] font-black uppercase">Qty</TableHead><TableHead className="text-right text-[10px] font-black uppercase">JMD $</TableHead><TableHead className="text-right text-[10px] font-black uppercase">Total</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {lineItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Input placeholder="e.g. Air Freight" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} className="h-10 font-bold uppercase text-xs" /></TableCell>
                                            <TableCell><Input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} min="1" className="h-10" /></TableCell>
                                            <TableCell><Input type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} className="text-right h-10 font-bold" placeholder="0.00" /></TableCell>
                                            <TableCell className="text-right font-black italic text-sm">JMD ${(item.quantity * item.price).toFixed(2)}</TableCell>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={addLineItem} className="font-bold uppercase text-[10px] border-2"><PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Service</Button>
                    </div>
                    <div className="flex justify-end pt-4 border-t-2 border-dashed">
                        <div className="text-right"><p className="text-[10px] font-bold uppercase opacity-60">Authorized Grand Total</p><p className="text-4xl font-black italic tracking-tighter text-primary">JMD ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="gap-2">
                <DialogClose asChild><Button variant="outline" className="h-14 font-bold uppercase" disabled={isGenerating}>Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleGenerateInvoice} disabled={isGenerating} className="flex-1 h-14 text-lg font-black uppercase italic shadow-xl">
                    {isGenerating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-2 h-6 w-6" />}
                    Authorize Bill
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
