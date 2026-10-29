'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
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
  CheckCircle2, 
  Loader2, 
  X,
  CreditCard,
  Banknote,
  Building2,
  Trash2,
  FileDown,
  TrendingDown,
  TrendingUp,
  DollarSign,
  UserCheck,
  Receipt,
  AlertCircle,
  Coins,
  Weight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * @fileOverview High-Performance POS Terminal for FromStore2Door.
 * Corrected to ensure customer-specific pricing and account standing updates.
 * Added Logicware status synchronization on checkout.
 */
export default function POSPage() {
    const { toast } = useToast();
    const { supabase } = useSupabase();
    const receiptRef = useRef<HTMLDivElement>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [userInvoices, setUserInvoices] = useState<any[]>([]);
    const [accountStanding, setAccountStanding] = useState<number>(0);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const [cashReceived, setCashReceived] = useState<string>('');
    const [receiptData, setReceiptData] = useState<any | null>(null);

    // Dynamic Search for Customers
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const findUsers = async () => {
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,mailbox_number.ilike.%${searchTerm}%`)
                    .limit(8);
                
                if (error) throw error;
                setSearchResults(data || []);
            } catch (err) {
                console.error("SEARCH ERROR:", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(findUsers, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, supabase]);

    const refreshUserData = useCallback(async (userId: string) => {
        setIsLoadingInvoices(true);
        try {
            const [profileRes, shipmentsRes, ledgerRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('shipments')
                    .select('*')
                    .eq('profile_id', userId)
                    .eq('status', 'Ready for pick up')
                    .eq('payment_status', 'Unpaid')
                    .order('created_at', { ascending: false }),
                supabase.from('financial_ledger')
                    .select('amount')
                    .eq('profile_id', userId)
            ]);

            if (profileRes.error) throw profileRes.error;

            // Update user and invoices
            setSelectedUser(profileRes.data);
            setUserInvoices(shipmentsRes.data || []);

            // Calculate Accounting Truth for Standing (Credit - Debit)
            const balance = (ledgerRes.data || []).reduce((sum, item) => sum + Number(item.amount), 0);
            setAccountStanding(balance);

        } catch (error: any) {
            console.error("POS DATA FETCH ERROR", error.message);
            toast({ title: "Fetch Error", description: "Could not retrieve latest registry data.", variant: "destructive" });
        } finally {
            setIsLoadingInvoices(false);
        }
    }, [supabase, toast]);

    const handleSelectUser = (user: any) => {
        setSearchTerm('');
        setSearchResults([]);
        // POS FIX: Explicitly clear selection when changing customers
        setSelectedInvoices(new Set());
        setCheckoutComplete(false);
        setCashReceived('');
        
        setSelectedUser(user);
        setAccountStanding(Number(user.wallet_balance || 0));
        refreshUserData(user.id);
    };

    const toggleInvoice = (id: string) => {
        const next = new Set(selectedInvoices);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedInvoices(next);
    };

    // Current checkout total based on selection
    const calculatedSelectedTotal = useMemo(() => {
        return userInvoices
            .filter(inv => selectedInvoices.has(inv.id))
            .reduce((sum, inv) => {
                const cost = Number(inv.total_cost_jmd) || calculateShippingCost(Number(inv.weight_lbs) || 0);
                return sum + cost;
            }, 0);
    }, [userInvoices, selectedInvoices]);

    // Account Standing Total: Sum of ALL "Ready for Pickup" charges
    const totalReadyToPickUpCharges = useMemo(() => {
        return userInvoices.reduce((sum, inv) => {
            const cost = Number(inv.total_cost_jmd) || calculateShippingCost(Number(inv.weight_lbs) || 0);
            return sum + cost;
        }, 0);
    }, [userInvoices]);

    const changeDue = useMemo(() => {
        if (paymentMethod !== 'Cash' || !cashReceived) return 0;
        const received = parseFloat(cashReceived) || 0;
        return Math.max(0, received - calculatedSelectedTotal);
    }, [cashReceived, calculatedSelectedTotal, paymentMethod]);

    const handleProcessPayment = async () => {
        if (!selectedUser) return;
        setIsProcessing(true);
        
        try {
            const itemsToSnap = userInvoices.filter(inv => selectedInvoices.has(inv.id));
            const totalToSettle = calculatedSelectedTotal;
            const trackingNumbers = itemsToSnap.map(s => s.tracking_number).filter(Boolean);

            const { error: shipError } = await supabase
                .from('shipments')
                .update({ 
                    status: 'Delivered', 
                    payment_status: 'Paid'
                })
                .in('id', Array.from(selectedInvoices));

            if (shipError) throw shipError;

            // Sync legacy invoices table
            if (trackingNumbers.length > 0) {
                await supabase
                    .from('invoices')
                    .update({ status: 'Paid' })
                    .in('tracking_number', trackingNumbers);
            }

            // Ledger mutation (Triggers profile wallet sync)
            const { error: ledgerError } = await supabase.from('financial_ledger').insert({
                profile_id: selectedUser.id,
                amount: totalToSettle, 
                transaction_type: 'payment',
                description: `POS Payment: ${trackingNumbers.join(', ')} via ${paymentMethod}`
            });

            if (ledgerError) throw ledgerError;

            // Sync status to Logicware Hub
            for (const id of Array.from(selectedInvoices)) {
                fetch('/api/admin/logicware-push-shipment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipmentId: id })
                }).catch(lwErr => console.warn('[POS:LOGICWARE_SYNC_FAIL]', lwErr));
            }

            // System Log
            await supabase.from('system_logs').insert({
                log_type: 'pos_transaction',
                description: `POS Checkout Complete: ${selectedUser.full_name}. JMD $${totalToSettle.toLocaleString()}`,
                actor_id: (await supabase.auth.getUser()).data.user?.id,
                metadata: { 
                    customerId: selectedUser.id, 
                    method: paymentMethod, 
                    amount: totalToSettle,
                    cashReceived: paymentMethod === 'Cash' ? parseFloat(cashReceived) : null,
                    changeGiven: paymentMethod === 'Cash' ? changeDue : null,
                    packagesCleared: trackingNumbers
                }
            });

            setReceiptData({
                customer: selectedUser,
                items: itemsToSnap,
                total: totalToSettle,
                method: paymentMethod,
                cashReceived: paymentMethod === 'Cash' ? parseFloat(cashReceived) : null,
                changeDue: paymentMethod === 'Cash' ? changeDue : null,
                date: new Date()
            });

            setCheckoutComplete(true);
            toast({ title: "Payment Secured", description: "Registry items marked as paid and packages released." });
            
            // Clean up and refresh
            setSelectedInvoices(new Set());
            refreshUserData(selectedUser.id);
        } catch (error: any) {
            toast({ title: "Checkout Error", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = async () => {
        if (!receiptRef.current || !receiptData) return;
        setIsGeneratingPdf(true);
        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
            pdf.addImage(imgData, 'PNG', 0, 0, 80, (canvas.height * 80) / canvas.width);
            pdf.save(`Receipt-${receiptData.customer.mailbox_number}.pdf`);
            toast({ title: "Receipt Generated" });
        } catch (error) {
            toast({ title: "PDF Error", variant: "destructive" });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const resetPOS = () => {
        setSelectedUser(null);
        setSelectedInvoices(new Set());
        setCheckoutComplete(false);
        setIsCheckoutOpen(false);
        setReceiptData(null);
        setSearchTerm('');
        setCashReceived('');
        setAccountStanding(0);
    };

    return (
        <div className="flex flex-col gap-6 max-w-full mx-auto pb-20">
            {/* Hidden Receipt Template */}
            <div className="fixed -left-[9999px] top-0">
                {receiptData && (
                    <div ref={receiptRef} className="bg-white p-8 font-mono text-black w-[400px]">
                        <div className="text-center border-b-2 border-black pb-4 mb-6">
                            <h1 className="text-2xl font-black uppercase tracking-tighter">FromStore2Door</h1>
                            <p className="text-[10px] mt-1 font-bold uppercase tracking-widest">Global Logistics POS</p>
                        </div>
                        <div className="space-y-2 text-xs mb-6 font-bold">
                            <div className="flex justify-between"><span>DATE:</span> <span>{receiptData.date.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>MAILBOX:</span> <span className="text-sm font-black">{receiptData.customer.mailbox_number}</span></div>
                            <div className="flex justify-between"><span>CLIENT:</span> <span className="uppercase">{receiptData.customer.full_name}</span></div>
                            <div className="flex justify-between"><span>METHOD:</span> <span className="uppercase">{receiptData.method}</span></div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between font-black border-b border-black pb-2 text-[10px] uppercase">
                                <span>Description / Tracking</span>
                                <span>Total (JMD)</span>
                            </div>
                            {receiptData.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between py-1">
                                    <div className="flex flex-col">
                                        <span className="uppercase font-bold">{item.tracking_number}</span>
                                        {item.contents && <span className="text-[8px] opacity-60 font-mono">{item.contents}</span>}
                                    </div>
                                    <span className="font-black">${Number(item.total_cost_jmd || calculateShippingCost(item.weight_lbs)).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <Separator className="border-black border-dashed my-6" />
                        <div className="space-y-2">
                            <div className="flex justify-between text-2xl font-black italic tracking-tighter">
                                <span>TOTAL:</span>
                                <span>$ {receiptData.total.toLocaleString()}</span>
                            </div>
                            {receiptData.method === 'Cash' && (
                                <>
                                    <div className="flex justify-between text-sm font-bold opacity-60">
                                        <span>CASH TENDERED:</span>
                                        <span>$ {Number(receiptData.cashReceived).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold">
                                        <span>CHANGE:</span>
                                        <span>$ {Number(receiptData.changeDue).toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="text-center mt-10 space-y-1">
                            <p className="text-[9px] font-black uppercase">Thank you for choosing FromStore2Door</p>
                            <p className="text-[8px] opacity-60">Portmore, St. Catherine, Jamaica</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-primary">Station POS</h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] flex items-center gap-2">
                        <Building2 className="h-3 w-3" /> Branch Terminal • Secure Checkout
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPOS} className="font-black uppercase italic border-2 h-9">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Clear Transaction
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                    {/* Customer Selection */}
                    <Card className="border shadow-md rounded-2xl">
                        <CardHeader className="bg-muted/30 py-3 border-b rounded-t-2xl">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <UserCheck className="h-3.5 w-3.5" /> 01. IDENTIFY ACCOUNT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-all", isSearching && "animate-pulse text-primary")} />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-14 pl-12 text-xl font-bold uppercase border-2 focus:border-primary rounded-xl shadow-inner placeholder:text-muted-foreground/30"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[8px] font-black uppercase text-primary">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Scanning...
                                        </div>
                                    )}
                                    
                                    {searchResults.length > 0 && (
                                        <div className="absolute w-full mt-2 bg-popover border-2 rounded-xl shadow-2xl z-[100] overflow-hidden divide-y">
                                            {searchResults.map(u => (
                                                <div key={u.id} onClick={() => handleSelectUser(u)} className="p-4 hover:bg-accent cursor-pointer flex items-center justify-between transition-colors group">
                                                    <div>
                                                        <p className="font-black text-lg text-primary uppercase italic tracking-tighter leading-none">{u.full_name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{u.email}</p>
                                                    </div>
                                                    <Badge className="font-mono font-bold uppercase rounded-lg border-2">
                                                        {u.mailbox_number}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn(
                                    "p-6 rounded-xl shadow-lg flex items-center justify-between gap-6 transition-all relative overflow-hidden",
                                    accountStanding < 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                                )}>
                                    <div className="relative z-10 flex-1 min-w-0">
                                        <div className="flex items-center gap-4">
                                            <p className="text-3xl font-black italic uppercase tracking-tighter truncate">{selectedUser.full_name}</p>
                                            <Badge variant="secondary" className="uppercase text-xs font-black italic border-white/20 h-7 shrink-0">
                                                {selectedUser.mailbox_number}
                                            </Badge>
                                        </div>
                                        <p className="font-bold opacity-70 uppercase tracking-[0.2em] text-[10px] mt-2 truncate">{selectedUser.email}</p>
                                    </div>
                                    <div className="relative z-10 text-right bg-black/10 p-4 rounded-xl border border-white/10 backdrop-blur-md min-w-[180px]">
                                        <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-1 italic">Account Standing</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-2xl font-black italic tracking-tighter">
                                                ${Math.abs(accountStanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} className="absolute top-2 right-2 text-current hover:bg-current/10 h-7 w-7 rounded-full">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ready for Pickup Parcels */}
                    <Card className="border shadow-md overflow-hidden rounded-2xl min-h-[400px]">
                        <CardHeader className="bg-muted/30 py-3 border-b">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <Package className="h-3.5 w-3.5" /> 02. SELECT READY PARCELS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                                    <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Syncing Registry...</p>
                                </div>
                            ) : !selectedUser ? (
                                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/10 italic">
                                    <p className="text-lg font-black uppercase tracking-[0.3em]">Awaiting Identity</p>
                                </div>
                            ) : userInvoices.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center p-6">
                                    <CheckCircle2 className="h-12 w-12 text-green-500 opacity-20" />
                                    <p className="text-xl font-black italic uppercase tracking-tighter opacity-40">No Parcels Awaiting Pickup</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50 h-14">
                                            <TableRow>
                                                <TableHead className="w-[50px] pl-6"></TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest min-w-[150px]">Tracking ID</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Weight (LBS)</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Price/LB</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-8">Line Total (JMD)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userInvoices.map((ship) => {
                                                const weight = Number(ship.weight_lbs) || 0;
                                                const totalCost = Number(ship.total_cost_jmd) || calculateShippingCost(weight);
                                                const effectiveRate = weight > 0 ? totalCost / weight : 0;

                                                return (
                                                    <TableRow 
                                                        key={ship.id} 
                                                        className={cn(
                                                            "hover:bg-accent cursor-pointer transition-all border-b h-20", 
                                                            selectedInvoices.has(ship.id) && "bg-primary/5"
                                                        )} 
                                                        onClick={() => toggleInvoice(ship.id)}
                                                    >
                                                        <TableCell className="pl-6">
                                                            <Checkbox 
                                                                checked={selectedInvoices.has(ship.id)} 
                                                                onCheckedChange={() => toggleInvoice(ship.id)} 
                                                                className="h-6 w-6 border-2 rounded-md" 
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="font-mono font-black text-primary uppercase text-sm italic tracking-tighter leading-none truncate max-w-[140px]">{ship.tracking_number}</p>
                                                            {ship.contents && (
                                                                <p className="text-[8px] font-bold text-muted-foreground uppercase truncate max-w-[140px] mt-1">{ship.contents}</p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black italic text-sm">{weight.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-[10px] font-bold opacity-60 italic">
                                                            ${effectiveRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8 font-black text-xl italic tracking-tighter text-primary">
                                                            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 sticky top-24">
                    {/* Settlement Authority Terminal */}
                    <Card className="border-none shadow-2xl bg-indigo-50/30 dark:bg-zinc-950 text-foreground dark:text-zinc-100 rounded-[2rem] overflow-hidden border-t-4 border-indigo-500">
                        <CardHeader className="bg-background/40 dark:bg-white/5 pb-6 pt-8 px-8 border-b border-indigo-100 dark:border-white/5">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-zinc-500 flex items-center gap-3 italic">
                                <Receipt className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> SETTLEMENT AUTHORITY
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 px-8 py-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Ready for Pickup Total</p>
                                    <span className="text-sm font-black italic text-indigo-600 dark:text-indigo-400">
                                        ${totalReadyToPickUpCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <Separator className="bg-indigo-100 dark:bg-white/10" />
                                <div className="text-center space-y-2">
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Transaction Subtotal</p>
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black italic tracking-tighter text-foreground dark:text-white">
                                            ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <Badge variant="outline" className="mt-4 bg-background dark:bg-white/5 text-[8px] font-black uppercase tracking-widest border-indigo-200 dark:border-white/10 px-4 h-6">
                                            {selectedInvoices.size} Parcels Selected
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-indigo-100 dark:bg-white/10" />

                            <div className="space-y-4">
                                <Label className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 italic">Payment Method</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'Cash', icon: <Banknote className="h-5 w-5" /> },
                                        { id: 'Card', icon: <CreditCard className="h-5 w-5" /> },
                                        { id: 'Transfer', icon: <Building2 className="h-5 w-5" /> }
                                    ].map(m => (
                                        <Label 
                                            key={m.id} 
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-indigo-100 dark:border-white/5 cursor-pointer hover:bg-background/60 dark:hover:bg-white/5 transition-all active:scale-95",
                                                paymentMethod === m.id ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-white" : "text-muted-foreground"
                                            )}
                                        >
                                            <div className={cn("mb-2", paymentMethod === m.id && "text-indigo-500 dark:text-indigo-400")}>{m.icon}</div>
                                            <span className="text-[9px] font-black uppercase italic tracking-tighter">{m.id}</span>
                                            <RadioGroupItem value={m.id} className="sr-only" />
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>

                            {paymentMethod === 'Cash' && selectedInvoices.size > 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-background/60 dark:bg-white/5 p-6 rounded-2xl border border-indigo-100 dark:border-white/5">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-500 ml-1 italic">Tendered (JMD)</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                                            <Input 
                                                type="number" 
                                                className="h-14 pl-10 text-2xl font-black bg-background border-2 border-indigo-200 dark:border-white/10 rounded-xl focus:border-indigo-500 transition-all" 
                                                placeholder="0.00"
                                                value={cashReceived}
                                                onChange={e => setCashReceived(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-background/40 dark:bg-black/40 p-4 rounded-xl border border-indigo-100 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Change</span>
                                        </div>
                                        <span className={cn(
                                            "text-xl font-black italic tracking-tighter",
                                            changeDue > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground/30"
                                        )}>
                                            ${changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pb-10 pt-4 px-8">
                            <Button 
                                onClick={() => setIsCheckoutOpen(true)} 
                                disabled={selectedInvoices.size === 0 || (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < calculatedSelectedTotal))} 
                                className="w-full h-20 text-2xl font-black italic uppercase tracking-tighter shadow-2xl rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white border-none"
                            >
                                <ShoppingCart className="h-6 w-6 mr-3" />
                                Process Checkout
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-xl p-0 rounded-[2rem] border-4">
                    {!checkoutComplete ? (
                        <div className="flex flex-col">
                            <div className="p-8 bg-muted/30 border-b-2">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-center">Confirm Authorization</DialogTitle>
                                </DialogHeader>
                            </div>
                            <div className="p-10 space-y-6">
                                <div className="p-8 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col items-center gap-6 text-center">
                                    <div className="bg-primary h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 text-white">
                                        <DollarSign className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-2 italic">Verify Registry Impact</p>
                                        <p className="text-6xl font-black italic tracking-tighter text-primary">
                                            ${(paymentMethod === 'Cash' ? parseFloat(cashReceived) : calculatedSelectedTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <div className="flex items-center justify-center gap-3 mt-6">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase px-4 h-7 border-2 bg-background">
                                                {paymentMethod}
                                            </Badge>
                                            {paymentMethod === 'Cash' && (
                                                <Badge className="bg-green-600 text-white text-[9px] font-black uppercase px-4 h-7">
                                                    RETURN ${changeDue.toLocaleString()}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-16 text-lg font-black uppercase italic border-2 rounded-xl">Cancel</Button>
                                    <Button onClick={handleProcessPayment} disabled={isProcessing} className="flex-[2] h-16 text-2xl font-black uppercase italic tracking-tighter rounded-xl shadow-xl">
                                        {isProcessing ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <CheckCircle2 className="mr-3 h-6 w-6" />} 
                                        Clear & Settle
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-8 animate-in zoom-in duration-300">
                            <div className="bg-green-500 h-24 w-24 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl transform rotate-12">
                                <CheckCircle2 className="h-12 w-12 text-white" />
                            </div>
                            <div>
                                <p className="text-5xl font-black italic uppercase tracking-tighter text-primary">Payment Secured</p>
                                <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-[10px] mt-4 opacity-60">REGISTRY UPDATED • INVENTORY RELEASED</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-6">
                                <Button className="h-16 text-lg font-black uppercase italic rounded-xl shadow-xl" onClick={handlePrintReceipt} disabled={isGeneratingPdf}>
                                    {isGeneratingPdf ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <FileDown className="mr-2 h-5 w-5" />} 
                                    Print Receipt
                                </Button>
                                <Button variant="outline" className="h-16 text-lg font-black border-2 uppercase italic rounded-xl" onClick={resetPOS}>
                                    Next Client <UserCheck className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}