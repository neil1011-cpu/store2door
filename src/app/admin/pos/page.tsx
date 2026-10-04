'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/supabase-provider';
import { cn } from '@/lib/utils';
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

export default function POSPage() {
    const { toast } = useToast();
    const { supabase } = useSupabase();
    const receiptRef = useRef<HTMLDivElement>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [userInvoices, setUserInvoices] = useState<any[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const [receiptData, setReceiptData] = useState<any | null>(null);

    // Fetch users based on search
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

    const refreshUserData = async (userId: string) => {
        setIsLoadingInvoices(true);
        try {
            const [profileRes, invoicesRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('invoices').select('*').eq('profile_id', userId).eq('status', 'Unpaid')
            ]);

            if (profileRes.data) setSelectedUser(profileRes.data);
            setUserInvoices(invoicesRes.data || []);
        } catch (error) {
            console.error("POS DATA FETCH ERROR", error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const handleSelectUser = (user: any) => {
        setSearchTerm('');
        setSearchResults([]);
        setSelectedInvoices(new Set());
        refreshUserData(user.id);
    };

    const toggleInvoice = (invoiceId: string) => {
        const next = new Set(selectedInvoices);
        if (next.has(invoiceId)) next.delete(invoiceId);
        else next.add(invoiceId);
        setSelectedInvoices(next);
    };

    const calculatedSelectedTotal = useMemo(() => {
        return userInvoices
            .filter(inv => selectedInvoices.has(inv.id))
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
    }, [userInvoices, selectedInvoices]);

    const handleProcessPayment = async () => {
        if (!selectedUser) return;
        setIsProcessing(true);
        
        try {
            const itemsToSnap = userInvoices.filter(inv => selectedInvoices.has(inv.id));
            const totalToSettle = calculatedSelectedTotal;

            // 1. Update Invoices
            await supabase
                .from('invoices')
                .update({ status: 'Paid' })
                .in('id', Array.from(selectedInvoices));

            // 2. Record in Financial Ledger
            const { error: ledgerError } = await supabase.from('financial_ledger').insert({
                profile_id: selectedUser.id,
                amount: totalToSettle, 
                transaction_type: 'payment',
                description: `POS Payment via ${paymentMethod}`
            });

            if (ledgerError) throw ledgerError;

            // 3. System Log
            await supabase.from('system_logs').insert({
                log_type: 'pos_transaction',
                description: `POS Checkout Complete: ${selectedUser.full_name}. JMD $${totalToSettle.toLocaleString()}`,
                actor_id: (await supabase.auth.getUser()).data.user?.id,
                metadata: { customerId: selectedUser.id, method: paymentMethod, amount: totalToSettle }
            });

            setReceiptData({
                customer: selectedUser,
                items: itemsToSnap,
                total: totalToSettle,
                method: paymentMethod,
                date: new Date()
            });

            setCheckoutComplete(true);
            toast({ title: "Payment Secured", description: "Registry items marked as paid." });
            
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
    };

    return (
        <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-20">
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
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between font-black border-b border-black pb-2 text-[10px] uppercase">
                                <span>Description</span>
                                <span>Total (JMD)</span>
                            </div>
                            {receiptData.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between py-1">
                                    <span className="uppercase">{item.invoice_number || 'Registry Item'}</span>
                                    <span className="font-black">${Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <Separator className="border-black border-dashed my-6" />
                        <div className="flex justify-between text-2xl font-black italic tracking-tighter">
                            <span>TOTAL PAID:</span>
                            <span>$ {receiptData.total.toLocaleString()}</span>
                        </div>
                        <div className="text-center mt-10 space-y-1">
                            <p className="text-[9px] font-black uppercase">Thank you for choosing FromStore2Door</p>
                            <p className="text-[8px] opacity-60">Portmore, St. Catherine, Jamaica</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Station POS</h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                        <Building2 className="h-3 w-3" /> Branch Terminal • PostgreSQL Registry
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={resetPOS} className="font-black uppercase italic border-2 h-12 px-6">
                        <Trash2 className="mr-2 h-4 w-4" /> Reset Station
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Step 1: Customer Selection */}
                    <Card className="border-none shadow-2xl rounded-3xl relative z-40">
                        <CardHeader className="bg-muted/30 pb-4 border-b rounded-t-3xl">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-muted-foreground">
                                <UserCheck className="h-4 w-4" /> 01. IDENTIFY ACCOUNT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className={cn("absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground transition-all", isSearching && "animate-pulse text-primary scale-110")} />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-24 pl-20 text-3xl font-black uppercase border-4 border-muted focus:border-primary transition-all rounded-[1.5rem] shadow-inner placeholder:text-muted-foreground/20"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Scanning Registry...
                                        </div>
                                    )}
                                    
                                    {searchResults.length > 0 && (
                                        <div className="absolute w-full mt-4 bg-white dark:bg-zinc-900 border-4 border-primary/20 rounded-3xl shadow-[0_40px_120px_-10px_rgba(0,0,0,0.6)] z-[100] overflow-hidden divide-y-2">
                                            {searchResults.map(u => (
                                                <div key={u.id} onClick={() => handleSelectUser(u)} className="p-8 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors group">
                                                    <div>
                                                        <p className="font-black text-2xl text-primary uppercase italic tracking-tighter leading-none group-hover:translate-x-2 transition-transform">{u.full_name}</p>
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">{u.email}</p>
                                                    </div>
                                                    <Badge className="h-12 px-8 text-lg font-black italic tracking-tighter uppercase rounded-2xl bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors border-2">
                                                        {u.mailbox_number}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                                        <div className="mt-4 p-8 text-center bg-muted/20 rounded-3xl border-4 border-dashed border-muted">
                                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                            <p className="text-xl font-black uppercase italic text-muted-foreground/40">No matching identity found</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn(
                                    "p-10 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 transition-all relative overflow-hidden group",
                                    Number(selectedUser.wallet_balance) < 0 ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
                                )}>
                                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
                                        <User size={240} />
                                    </div>
                                    <div className="relative z-10 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                                            <p className="text-6xl font-black italic uppercase tracking-tighter leading-none drop-shadow-xl">{selectedUser.full_name}</p>
                                            <Badge className="bg-white/20 text-white uppercase text-sm font-black italic border-white/20 px-6 h-10 self-center md:self-auto backdrop-blur-md">
                                                {selectedUser.mailbox_number}
                                            </Badge>
                                        </div>
                                        <p className="font-bold opacity-70 uppercase tracking-[0.3em] text-xs mt-6">{selectedUser.email}</p>
                                    </div>
                                    <div className="relative z-10 text-center md:text-right bg-black/20 p-8 rounded-3xl border-2 border-white/10 backdrop-blur-xl min-w-[300px]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-3 italic">Authorized Standing</p>
                                        <div className="flex items-center justify-center md:justify-end gap-4">
                                            {Number(selectedUser.wallet_balance) < 0 ? <TrendingDown className="h-8 w-8 text-red-200" /> : <TrendingUp className="h-8 w-8 text-green-200" />}
                                            <span className="text-5xl font-black italic tracking-tighter">
                                                JMD ${Math.abs(Number(selectedUser.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-white hover:bg-white/20 h-12 w-12 rounded-full border-2 border-white/10">
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Invoices */}
                    <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem] min-h-[500px] relative z-10">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-muted-foreground">
                                <Package className="h-4 w-4" /> 02. SELECT SETTLEMENT ITEMS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-96 flex flex-col items-center justify-center gap-6">
                                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                    <p className="text-sm font-black uppercase tracking-[0.5em] opacity-40 animate-pulse">Syncing Worldwide Registry...</p>
                                </div>
                            ) : !selectedUser ? (
                                <div className="h-96 flex flex-col items-center justify-center text-muted-foreground/10 italic">
                                    <Search size={150} className="mb-6 opacity-5" />
                                    <p className="text-2xl font-black uppercase tracking-[0.4em]">Awaiting Identity</p>
                                </div>
                            ) : userInvoices.length === 0 ? (
                                <div className="h-96 flex flex-col items-center justify-center gap-8 text-center p-12">
                                    <div className="bg-green-100 p-12 rounded-[2.5rem] border-8 border-white shadow-2xl animate-in zoom-in spin-in-1">
                                        <CheckCircle2 className="h-24 w-24 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-5xl font-black italic uppercase tracking-tighter text-primary">Registry Settled</p>
                                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.3em] mt-4 opacity-40">Zero Unpaid entries detected for this mailbox.</p>
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 h-20">
                                        <TableRow>
                                            <TableHead className="w-[100px] pl-10"></TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.3em]">Document ID</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.3em]">Authorized Date</TableHead>
                                            <TableHead className="text-right pr-14 text-[10px] font-black uppercase tracking-[0.3em]">Line Total (JMD)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userInvoices.map((inv) => (
                                            <TableRow 
                                                key={inv.id} 
                                                className={cn(
                                                    "hover:bg-primary/5 cursor-pointer transition-all border-b-4 h-32", 
                                                    selectedInvoices.has(inv.id) && "bg-primary/10"
                                                )} 
                                                onClick={() => toggleInvoice(inv.id)}
                                            >
                                                <TableCell className="pl-10">
                                                    <Checkbox 
                                                        checked={selectedInvoices.has(inv.id)} 
                                                        onCheckedChange={() => toggleInvoice(inv.id)} 
                                                        className="h-10 w-10 border-4 rounded-xl data-[state=checked]:bg-primary shadow-lg" 
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono font-black text-primary uppercase text-2xl italic tracking-tighter">{inv.invoice_number}</TableCell>
                                                <TableCell className="text-xs font-black opacity-40 uppercase tracking-widest">{new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'full' })}</TableCell>
                                                <TableCell className="text-right pr-14 font-black text-4xl italic tracking-tighter text-primary">
                                                    <span className="text-lg opacity-20 mr-2 font-black italic">JMD</span>
                                                    ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4">
                    {/* Step 3: Checkout Terminal - HARDENED CONTRAST FOR LIGHT MODE */}
                    <Card className="border-none shadow-[0_50px_100px_-30px_rgba(0,0,0,0.6)] bg-zinc-950 text-zinc-100 sticky top-24 rounded-[3rem] overflow-hidden border-t-8 border-indigo-500">
                        <CardHeader className="bg-white/5 pb-10 pt-10 px-10 border-b border-white/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 flex items-center gap-4 italic">
                                <Receipt className="h-5 w-5 text-indigo-400" /> SECURE CHECKOUT TERMINAL
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-12 px-10 py-10">
                            <div className="text-center space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60 italic animate-pulse">Settlement Authority Grand Total</p>
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <span className="text-2xl font-black opacity-20 text-white italic tracking-widest">JMD</span>
                                    <span className="text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">
                                        ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <Badge className="bg-white/10 text-white uppercase text-[9px] font-black italic tracking-[0.2em] border-white/10 px-6 h-8">
                                        {selectedInvoices.size} Documents Selected
                                    </Badge>
                                </div>
                            </div>

                            <Separator className="bg-white/10 h-1" />

                            <div className="space-y-8">
                                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-2 italic">Form of Tender</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'Cash', icon: <Banknote className="h-8 w-8" /> },
                                        { id: 'Card', icon: <CreditCard className="h-8 w-8" /> },
                                        { id: 'Transfer', icon: <Building2 className="h-8 w-8" /> }
                                    ].map(m => (
                                        <Label 
                                            key={m.id} 
                                            className={cn(
                                                "flex flex-col items-center justify-center p-8 rounded-[2rem] border-4 border-white/5 cursor-pointer hover:bg-white/5 transition-all active:scale-95 group",
                                                paymentMethod === m.id ? "border-indigo-500 bg-indigo-500/20 text-white shadow-[0_0_40px_rgba(99,102,241,0.2)]" : "text-zinc-600"
                                            )}
                                        >
                                            <div className={cn("mb-4 transition-all duration-300", paymentMethod === m.id && "scale-125 rotate-6 text-indigo-400")}>{m.icon}</div>
                                            <span className="text-xs font-black uppercase italic tracking-tighter">{m.id}</span>
                                            <RadioGroupItem value={m.id} className="sr-only" />
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                        <CardFooter className="pb-14 pt-10 px-10">
                            <Button 
                                onClick={() => setIsCheckoutOpen(true)} 
                                disabled={selectedInvoices.size === 0} 
                                className="w-full h-32 text-4xl font-black italic uppercase tracking-tighter shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] rounded-[2rem] group transition-all duration-500 relative overflow-hidden bg-indigo-600 hover:bg-indigo-500"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 group-hover:scale-110 transition-transform" />
                                <span className="relative flex items-center gap-4 text-white">
                                    <ShoppingCart className="h-10 w-10 group-hover:scale-125 group-hover:rotate-12 transition-all" />
                                    Process Now
                                </span>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[3rem] border-8 border-primary/20">
                    {!checkoutComplete ? (
                        <div className="flex flex-col">
                            <div className="p-12 bg-muted/30 border-b-4 border-muted">
                                <DialogHeader>
                                    <DialogTitle className="text-5xl font-black italic uppercase tracking-tighter text-center">Confirm Funds</DialogTitle>
                                </DialogHeader>
                            </div>
                            <div className="p-12 space-y-12">
                                <div className="p-12 rounded-[2.5rem] bg-primary/5 border-4 border-dashed border-primary/20 flex flex-col items-center gap-8 text-center">
                                    <div className="bg-primary h-24 w-24 rounded-3xl flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transform rotate-6 border-4 border-white dark:border-zinc-900">
                                        <DollarSign className="h-12 w-12 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40 mb-4 italic">VERIFY PHYSICAL CURRENCY RECEIVED</p>
                                        <p className="text-8xl font-black italic tracking-tighter text-primary">
                                            ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <Badge variant="outline" className="mt-8 text-xs font-black uppercase px-8 h-10 border-2 tracking-widest bg-white">
                                            {paymentMethod} TENDER
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-20 text-xl font-black uppercase italic border-4 rounded-3xl">Abort</Button>
                                    <Button onClick={handleProcessPayment} disabled={isProcessing} className="flex-[2] h-20 text-3xl font-black uppercase italic tracking-tighter rounded-3xl shadow-2xl relative overflow-hidden group">
                                        {isProcessing ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <CheckCircle2 className="mr-3 h-8 w-8 group-hover:scale-125 transition-transform" />} 
                                        Authorize & Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-16 text-center space-y-12 animate-in zoom-in duration-500">
                            <div className="bg-green-500 h-40 w-40 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40 transform rotate-12 border-[12px] border-white dark:border-zinc-900">
                                <CheckCircle2 className="h-20 w-24 text-white" />
                            </div>
                            <div>
                                <p className="text-7xl font-black italic uppercase tracking-tighter text-primary">Payment Secured</p>
                                <p className="text-muted-foreground font-black uppercase tracking-[0.5em] text-xs mt-6 opacity-60">REGISTRY UPDATED • INVENTORY RELEASE AUTHORIZED</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                                <Button className="h-24 text-2xl font-black uppercase italic rounded-3xl shadow-2xl group" onClick={handlePrintReceipt} disabled={isGeneratingPdf}>
                                    {isGeneratingPdf ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <FileDown className="mr-4 h-8 w-8 group-hover:translate-y-1 transition-transform" />} 
                                    Print Receipt
                                </Button>
                                <Button variant="outline" className="h-24 text-2xl font-black border-4 uppercase italic rounded-3xl group" onClick={resetPOS}>
                                    Next Client <UserCheck className="ml-4 h-8 w-8 group-hover:scale-125 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}