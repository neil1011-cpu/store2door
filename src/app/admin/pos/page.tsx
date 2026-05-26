'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  Printer, 
  Loader2, 
  X,
  CreditCard,
  Banknote,
  Building2,
  Trash2,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { UserProfile, Invoice } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogClose 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AppLogo } from '@/components/app-logo';

/**
 * @fileOverview POS System with integrated Receipt Printing.
 */

export default function POSPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    
    // Receipt Snapshot Data
    const [receiptData, setReceiptData] = useState<{
        customer: UserProfile;
        items: Invoice[];
        total: number;
        method: string;
        date: Date;
    } | null>(null);

    // 1. Fetch All Users for Search
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('fullName', 'asc'));
    }, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    // 2. Fetch Unpaid Invoices for Selected User
    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedUser) return null;
        return query(
            collection(firestore, 'invoices'), 
            where('customerId', '==', selectedUser.id),
            where('status', '==', 'Unpaid')
        );
    }, [firestore, selectedUser]);
    const { data: userInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

    // 3. Search Filter
    const filteredUsers = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const lower = searchTerm.toLowerCase();
        return (users || []).filter(u => 
            u.fullName.toLowerCase().includes(lower) || 
            u.email.toLowerCase().includes(lower) || 
            u.mailboxNumber?.toLowerCase().includes(lower)
        ).slice(0, 5);
    }, [users, searchTerm]);

    const totalToPay = useMemo(() => {
        if (!userInvoices) return 0;
        return userInvoices
            .filter(inv => selectedInvoices.has(inv.id))
            .reduce((sum, inv) => sum + inv.amount, 0);
    }, [userInvoices, selectedInvoices]);

    const handleSelectUser = (user: UserProfile) => {
        setSelectedUser(user);
        setSearchTerm('');
        setSelectedInvoices(new Set());
    };

    const toggleInvoice = (invoiceId: string) => {
        const next = new Set(selectedInvoices);
        if (next.has(invoiceId)) next.delete(invoiceId);
        else next.add(invoiceId);
        setSelectedInvoices(next);
    };

    const handleProcessPayment = async () => {
        if (!selectedUser || selectedInvoices.size === 0) return;
        
        setIsProcessing(true);
        const batch = writeBatch(firestore);
        
        try {
            const itemsToSnap: Invoice[] = userInvoices?.filter(inv => selectedInvoices.has(inv.id)) || [];

            // Update Invoices
            selectedInvoices.forEach(id => {
                const invRef = doc(firestore, 'invoices', id);
                batch.update(invRef, { 
                    status: 'Paid',
                    paymentMethod,
                    paidAt: serverTimestamp()
                });
            });

            // Log Transaction
            const transactionRef = doc(collection(firestore, 'transactions'));
            batch.set(transactionRef, {
                type: 'revenue',
                amount: totalToPay,
                description: `POS Payment - ${selectedUser.fullName} (${selectedUser.mailboxNumber})`,
                date: serverTimestamp(),
                method: paymentMethod,
                customerId: selectedUser.id,
                items: Array.from(selectedInvoices)
            });

            await batch.commit();
            
            // Set Receipt Snapshot
            setReceiptData({
                customer: selectedUser,
                items: itemsToSnap,
                total: totalToPay,
                method: paymentMethod,
                date: new Date()
            });

            setCheckoutComplete(true);
            toast({ title: "Payment Processed!", description: `JMD $${totalToPay.toLocaleString()} recorded via ${paymentMethod}.` });
        } catch (error) {
            toast({ title: "Checkout Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    const resetPOS = () => {
        setSelectedUser(null);
        setSelectedInvoices(new Set());
        setCheckoutComplete(false);
        setIsCheckoutOpen(false);
        setReceiptData(null);
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Print Only Receipt Container */}
            {receiptData && (
                <div className="hidden print:block fixed inset-0 bg-white p-8 font-mono text-black">
                    <div className="max-w-[300px] mx-auto space-y-6">
                        <div className="text-center border-b pb-4">
                            <h1 className="text-xl font-bold uppercase tracking-tighter">FromStore2Door</h1>
                            <p className="text-[10px] mt-1">4350 NE 5th Terrace Bay #3</p>
                            <p className="text-[10px]">Oakland Park, Florida, 33334</p>
                            <p className="text-[10px] font-bold mt-2">admin@neilussolutions.com</p>
                        </div>

                        <div className="space-y-1 text-[10px]">
                            <div className="flex justify-between"><span>DATE:</span> <span>{receiptData.date.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>CUSTOMER:</span> <span className="font-bold">{receiptData.customer.fullName}</span></div>
                            <div className="flex justify-between"><span>MAILBOX:</span> <span className="font-bold">{receiptData.customer.mailboxNumber}</span></div>
                        </div>

                        <Separator className="border-black border-dashed" />

                        <div className="space-y-3 text-[10px]">
                            <div className="grid grid-cols-4 font-bold border-b pb-1">
                                <span className="col-span-2">DESCRIPTION</span>
                                <span className="text-right">QTY</span>
                                <span className="text-right">TOTAL</span>
                            </div>
                            {receiptData.items.map(item => (
                                <div key={item.id} className="grid grid-cols-4 py-1">
                                    <span className="col-span-2">{item.invoiceId} - SHIPMENT</span>
                                    <span className="text-right">1</span>
                                    <span className="text-right">${item.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <Separator className="border-black border-dashed" />

                        <div className="space-y-1">
                            <div className="flex justify-between text-lg font-black">
                                <span>TOTAL:</span>
                                <span>JMD ${receiptData.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>PAID VIA:</span>
                                <span>{receiptData.method.toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="text-center pt-8 border-t border-dashed">
                            <p className="text-[10px] font-bold italic uppercase">*** THANK YOU FOR SHIPPING WITH US ***</p>
                            <p className="text-[8px] mt-2 opacity-60">System Receipt Generated by FSTD OS</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Dashboard Header */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8" /> POS Checkout System
                    </h1>
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Branch Intake & Payment Center</p>
                </div>
                <Button variant="outline" onClick={resetPOS} className="font-bold border-2">
                    <Trash2 className="mr-2 h-4 w-4" /> Reset Station
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
                {/* Left Column: Customer & Item Selection */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Customer Lookup */}
                    <Card className="border-none shadow-xl">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> 1. Identify Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-16 pl-12 text-xl font-bold uppercase border-4 border-muted focus:border-primary transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {filteredUsers.length > 0 && (
                                        <div className="absolute w-full mt-2 bg-background border-2 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {filteredUsers.map(u => (
                                                <div 
                                                    key={u.id} 
                                                    onClick={() => handleSelectUser(u)}
                                                    className="p-4 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-black text-primary uppercase">{u.fullName}</p>
                                                        <p className="text-xs font-bold text-muted-foreground">{u.email}</p>
                                                    </div>
                                                    <Badge className="h-8 px-4 text-sm font-black italic tracking-tighter uppercase">{u.mailboxNumber}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-6 bg-primary text-primary-foreground rounded-2xl shadow-inner group">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-white/20 p-4 rounded-full">
                                            <User className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <p className="text-4xl font-black italic uppercase tracking-tighter">{selectedUser.fullName}</p>
                                            <p className="font-bold opacity-80 uppercase tracking-widest text-[10px] mt-1">Mailbox: {selectedUser.mailboxNumber} • {selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-white hover:bg-white/10 h-14 w-14 rounded-full shrink-0">
                                        <X className="h-8 w-8" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Unpaid Items Table */}
                    <Card className="border-none shadow-xl overflow-hidden min-h-[400px]">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> 2. Select Items for Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Scanning Network Records...</p>
                                </div>
                            ) : !selectedUser ? (
                                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-30 italic">
                                    <Search className="h-12 w-12 mb-2" />
                                    <p>Select a customer to view pending items.</p>
                                </div>
                            ) : (userInvoices?.length || 0) === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center p-8">
                                    <div className="bg-green-100 p-6 rounded-full">
                                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic uppercase tracking-tighter">Account Clear</p>
                                        <p className="text-muted-foreground text-sm font-medium">This customer has no outstanding balances.</p>
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[50px] pl-6"></TableHead>
                                            <TableHead>Invoice ID</TableHead>
                                            <TableHead>Date Logged</TableHead>
                                            <TableHead className="text-right pr-6">Amount (JMD)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userInvoices?.map((inv) => (
                                            <TableRow 
                                                key={inv.id} 
                                                className={cn("hover:bg-primary/5 cursor-pointer h-20 transition-colors", selectedInvoices.has(inv.id) && "bg-primary/10")}
                                                onClick={() => toggleInvoice(inv.id)}
                                            >
                                                <TableCell className="pl-6">
                                                    <Checkbox 
                                                        checked={selectedInvoices.has(inv.id)} 
                                                        onCheckedChange={() => toggleInvoice(inv.id)}
                                                        className="h-6 w-6 border-2"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono font-black text-primary uppercase text-lg">{inv.invoiceId}</TableCell>
                                                <TableCell className="text-xs font-bold opacity-60">
                                                    {inv.date?.toDate ? inv.date.toDate().toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-black text-xl tracking-tighter">
                                                    JMD ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Checkout Summary */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-2xl bg-zinc-950 text-zinc-100 sticky top-24 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
                        <CardHeader className="pb-8">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Cart Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest opacity-60">
                                    <span>Selected Items</span>
                                    <span>{selectedInvoices.size}</span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {userInvoices?.filter(i => selectedInvoices.has(i.id)).map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 group">
                                            <div className="text-xs font-mono font-bold text-primary">{i.invoiceId}</div>
                                            <div className="text-sm font-black italic">${i.amount.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator className="bg-white/10" />

                            <div className="text-center space-y-2 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Grand Total Due</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl font-bold opacity-30 text-primary">JMD</span>
                                    <span className="text-6xl font-black italic tracking-tighter text-white">${totalToPay.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Method of Payment</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-2">
                                    <Label className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 border-white/10 cursor-pointer hover:bg-white/5 transition-all", paymentMethod === 'Cash' && "border-primary bg-primary/10 text-primary")}>
                                        <Banknote className="h-6 w-6 mb-1" />
                                        <span className="text-[9px] font-black uppercase italic">Cash</span>
                                        <RadioGroupItem value="Cash" className="sr-only" />
                                    </Label>
                                    <Label className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 border-white/10 cursor-pointer hover:bg-white/5 transition-all", paymentMethod === 'Card' && "border-primary bg-primary/10 text-primary")}>
                                        <CreditCard className="h-6 w-6 mb-1" />
                                        <span className="text-[9px] font-black uppercase italic">Card</span>
                                        <RadioGroupItem value="Card" className="sr-only" />
                                    </Label>
                                    <Label className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 border-white/10 cursor-pointer hover:bg-white/5 transition-all", paymentMethod === 'Transfer' && "border-primary bg-primary/10 text-primary")}>
                                        <Building2 className="h-6 w-6 mb-1" />
                                        <span className="text-[9px] font-black uppercase italic">Wire</span>
                                        <RadioGroupItem value="Transfer" className="sr-only" />
                                    </Label>
                                </RadioGroup>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 pb-8">
                            <Button 
                                onClick={() => setIsCheckoutOpen(true)} 
                                disabled={selectedInvoices.size === 0} 
                                className="w-full h-20 text-2xl font-black italic uppercase tracking-tighter shadow-2xl group overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Finalize Checkout <ShoppingCart className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
                                </span>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {/* Checkout Confirmation Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Transaction Confirmation</DialogTitle>
                        <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Authorized Administrative Processing</DialogDescription>
                    </DialogHeader>

                    {!checkoutComplete ? (
                        <div className="space-y-6 py-6">
                            <div className="p-6 rounded-2xl bg-muted/30 border-2 border-dashed flex flex-col items-center gap-4 text-center">
                                <DollarSign className="h-12 w-12 text-primary animate-bounce" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Confirm Receipt of Funds</p>
                                    <p className="text-4xl font-black tracking-tighter">JMD ${totalToPay.toLocaleString()}</p>
                                    <p className="text-[11px] font-bold text-primary mt-2">VIA {paymentMethod.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="bg-primary/5 p-4 rounded-xl space-y-1">
                                <p className="text-[10px] font-black uppercase opacity-60">Impacted Account</p>
                                <p className="font-bold text-lg">{selectedUser?.fullName}</p>
                                <p className="text-xs font-mono opacity-60">Items Selected: {selectedInvoices.size}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-8 text-center animate-in zoom-in-95">
                            <div className="bg-green-500 h-24 w-24 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                                <CheckCircle2 className="h-16 w-12 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-black italic uppercase tracking-tighter">Payment Complete</p>
                                <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Transaction Secured & Logged</p>
                            </div>
                            <Separator className="bg-muted" />
                            <div className="grid grid-cols-2 gap-4">
                                <Button className="h-14 font-black uppercase tracking-tight" onClick={handlePrintReceipt}>
                                    <Printer className="mr-2 h-5 w-5" /> Print Receipt
                                </Button>
                                <Button variant="outline" className="h-14 font-black border-2 uppercase tracking-tight" onClick={resetPOS}>
                                    New Customer
                                </Button>
                            </div>
                        </div>
                    )}

                    {!checkoutComplete && (
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <DialogClose asChild>
                                <Button variant="ghost" className="font-bold uppercase h-12">Cancel</Button>
                            </DialogClose>
                            <Button 
                                onClick={handleProcessPayment} 
                                disabled={isProcessing} 
                                className="flex-1 h-12 font-black uppercase italic tracking-tight"
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize Payment Now"}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
