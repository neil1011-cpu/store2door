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
  Receipt
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
        if (!searchTerm || searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        const findUsers = async () => {
            setIsSearching(true);
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,mailbox_number.ilike.%${searchTerm}%`)
                .limit(5);
            setSearchResults(data || []);
            setIsSearching(false);
        };

        const timer = setTimeout(findUsers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, supabase]);

    // Fetch invoices and refresh profile when user is selected
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
            toast({ title: "Payment Secured", description: "Registry items marked as paid and account credited." });
            
            // Refresh state for next step or persistence
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
                        <Building2 className="h-3 w-3" /> Branch Terminal • PostgreSQL Financial Gateway
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
                    <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <UserCheck className="h-4 w-4" /> 01. Identify Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className={cn("absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground transition-all", isSearching && "animate-pulse text-primary scale-110")} />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-20 pl-16 text-2xl font-black uppercase border-4 border-muted focus:border-primary transition-all rounded-2xl shadow-inner placeholder:text-muted-foreground/30"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute w-full mt-4 bg-background border-2 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y-2">
                                            {searchResults.map(u => (
                                                <div key={u.id} onClick={() => handleSelectUser(u)} className="p-6 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors">
                                                    <div>
                                                        <p className="font-black text-xl text-primary uppercase italic tracking-tighter leading-none">{u.full_name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{u.email}</p>
                                                    </div>
                                                    <Badge className="h-10 px-6 text-sm font-black italic tracking-tighter uppercase rounded-xl">
                                                        {u.mailbox_number}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn(
                                    "p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 transition-all relative overflow-hidden group",
                                    Number(selectedUser.wallet_balance) < 0 ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
                                )}>
                                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
                                        <User size={180} />
                                    </div>
                                    <div className="relative z-10 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <p className="text-5xl font-black italic uppercase tracking-tighter leading-none">{selectedUser.full_name}</p>
                                            <Badge className="bg-white/20 text-white uppercase text-xs font-black italic border-white/10 px-4 h-8 self-center md:self-auto">
                                                {selectedUser.mailbox_number}
                                            </Badge>
                                        </div>
                                        <p className="font-bold opacity-70 uppercase tracking-[0.2em] text-[10px] mt-4">{selectedUser.email}</p>
                                    </div>
                                    <div className="relative z-10 text-center md:text-right bg-black/10 p-6 rounded-2xl border border-white/5 backdrop-blur-sm min-w-[240px]">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ledger Standing</p>
                                        <div className="flex items-center justify-center md:justify-end gap-3">
                                            {Number(selectedUser.wallet_balance) < 0 ? <TrendingDown className="h-6 w-6 text-red-200" /> : <TrendingUp className="h-6 w-6 text-green-200" />}
                                            <span className="text-4xl font-black italic tracking-tighter">
                                                JMD ${Math.abs(Number(selectedUser.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-white hover:bg-white/20 h-10 w-10 rounded-full">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Invoices */}
                    <Card className="border-none shadow-2xl overflow-hidden rounded-3xl min-h-[500px]">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <Package className="h-4 w-4" /> 02. Select Settlement Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-96 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Scanning Global Registry...</p>
                                </div>
                            ) : !selectedUser ? (
                                <div className="h-96 flex flex-col items-center justify-center text-muted-foreground opacity-20 italic">
                                    <Search size={80} className="mb-6" />
                                    <p className="text-sm font-black uppercase tracking-widest">Awaiting Customer ID</p>
                                </div>
                            ) : userInvoices.length === 0 ? (
                                <div className="h-96 flex flex-col items-center justify-center gap-6 text-center p-12">
                                    <div className="bg-green-100 p-8 rounded-full border-4 border-white shadow-xl animate-in zoom-in">
                                        <CheckCircle2 className="h-16 w-16 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black italic uppercase tracking-tighter">Account Fully Settled</p>
                                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">All registry items are cleared in Supabase.</p>
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 h-14">
                                        <TableRow>
                                            <TableHead className="w-[80px] pl-8"></TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Document ID</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Issue Date</TableHead>
                                            <TableHead className="text-right pr-12 text-[10px] font-black uppercase tracking-widest">Line Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userInvoices.map((inv) => (
                                            <TableRow 
                                                key={inv.id} 
                                                className={cn(
                                                    "hover:bg-primary/5 cursor-pointer transition-all border-b-2 h-24", 
                                                    selectedInvoices.has(inv.id) && "bg-primary/10"
                                                )} 
                                                onClick={() => toggleInvoice(inv.id)}
                                            >
                                                <TableCell className="pl-8">
                                                    <Checkbox 
                                                        checked={selectedInvoices.has(inv.id)} 
                                                        onCheckedChange={() => toggleInvoice(inv.id)} 
                                                        className="h-8 w-8 border-4 rounded-lg data-[state=checked]:bg-primary" 
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono font-black text-primary uppercase text-lg italic">{inv.invoice_number}</TableCell>
                                                <TableCell className="text-[11px] font-bold opacity-60 uppercase tracking-tight">{new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</TableCell>
                                                <TableCell className="text-right pr-12 font-black text-2xl italic tracking-tighter">JMD ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4">
                    {/* Step 3: Checkout Terminal */}
                    <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] bg-zinc-950 text-zinc-100 sticky top-24 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-white/5 pb-10 pt-10 px-10">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-3">
                                <Receipt className="h-4 w-4" /> Checkout Terminal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-12 px-10">
                            <div className="text-center space-y-4 py-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/80 italic">Authorized Settlement Total</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-4xl font-black opacity-20 text-primary">JMD</span>
                                    <span className="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
                                        ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-center gap-2">
                                    <Badge className="bg-primary/20 text-primary uppercase text-[8px] font-black italic tracking-widest border-primary/20">
                                        {selectedInvoices.size} Registry Items Selected
                                    </Badge>
                                </div>
                            </div>

                            <Separator className="bg-white/10" />

                            <div className="space-y-6">
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Form of Tender</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'Cash', icon: <Banknote /> },
                                        { id: 'Card', icon: <CreditCard /> },
                                        { id: 'Transfer', icon: <Building2 /> }
                                    ].map(m => (
                                        <Label 
                                            key={m.id} 
                                            className={cn(
                                                "flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-white/5 cursor-pointer hover:bg-white/5 transition-all active:scale-95",
                                                paymentMethod === m.id ? "border-primary bg-primary/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-zinc-500"
                                            )}
                                        >
                                            <div className={cn("mb-3 transition-transform", paymentMethod === m.id && "scale-125")}>{m.icon}</div>
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">{m.id}</span>
                                            <RadioGroupItem value={m.id} className="sr-only" />
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                        <CardFooter className="pb-12 pt-8 px-10">
                            <Button 
                                onClick={() => setIsCheckoutOpen(true)} 
                                disabled={selectedInvoices.size === 0} 
                                className="w-full h-24 text-2xl font-black italic uppercase tracking-tighter shadow-2xl rounded-2xl group transition-all"
                            >
                                <ShoppingCart className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                                Finalize Settlement
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-4">
                    {!checkoutComplete ? (
                        <div className="flex flex-col">
                            <div className="p-10 bg-muted/30 border-b-2">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-center">Confirm Settlement</DialogTitle>
                                </DialogHeader>
                            </div>
                            <div className="p-10 space-y-10">
                                <div className="p-8 rounded-3xl bg-primary/5 border-4 border-dashed border-primary/20 flex flex-col items-center gap-6 text-center">
                                    <div className="bg-primary h-20 w-20 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3">
                                        <DollarSign className="h-10 w-10 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mb-3 italic">Verify Physical Funds</p>
                                        <p className="text-6xl font-black italic tracking-tighter text-primary">
                                            JMD ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-60">Method: {paymentMethod}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-16 font-black uppercase italic border-2 rounded-2xl">Abort</Button>
                                    <Button onClick={handleProcessPayment} disabled={isProcessing} className="flex-[2] h-16 text-xl font-black uppercase italic tracking-tight rounded-2xl shadow-xl">
                                        {isProcessing ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} 
                                        Authorize & Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-10 animate-in zoom-in duration-300">
                            <div className="bg-green-500 h-32 w-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20 transform rotate-6 border-8 border-white dark:border-zinc-900">
                                <CheckCircle2 className="h-16 w-16 text-white" />
                            </div>
                            <div>
                                <p className="text-5xl font-black italic uppercase tracking-tighter">Registry Cleared</p>
                                <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-[11px] mt-4">Funds Received • Account Integrity Confirmed</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <Button className="h-20 text-lg font-black uppercase italic rounded-2xl shadow-xl" onClick={handlePrintReceipt} disabled={isGeneratingPdf}>
                                    {isGeneratingPdf ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-3 h-6 w-6" />} 
                                    Print Receipt
                                </Button>
                                <Button variant="outline" className="h-20 text-lg font-black border-4 uppercase italic rounded-2xl" onClick={resetPOS}>
                                    Next Client <UserCheck className="ml-3 h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
