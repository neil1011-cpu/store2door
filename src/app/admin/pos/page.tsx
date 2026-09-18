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
  DollarSign
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
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Hidden Receipt Template */}
            <div className="fixed -left-[9999px] top-0">
                {receiptData && (
                    <div ref={receiptRef} className="bg-white p-8 font-mono text-black w-[400px]">
                        <div className="text-center border-b-2 border-black pb-4 mb-6">
                            <h1 className="text-2xl font-black uppercase">FromStore2Door</h1>
                            <p className="text-xs mt-1">Global Logistics POS</p>
                        </div>
                        <div className="space-y-2 text-xs mb-6">
                            <div className="flex justify-between"><span>DATE:</span> <span>{receiptData.date.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>MAILBOX:</span> <span className="font-bold">{receiptData.customer.mailbox_number}</span></div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between font-black border-b border-black pb-2">
                                <span>DESCRIPTION</span>
                                <span>TOTAL</span>
                            </div>
                            {receiptData.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between py-1">
                                    <span>{item.invoice_number || 'Registry Item'}</span>
                                    <span>JMD ${Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <Separator className="border-black border-dashed my-6" />
                        <div className="flex justify-between text-xl font-black">
                            <span>TOTAL PAID:</span>
                            <span>JMD ${receiptData.total.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">POS Checkout</h1>
                    <p className="text-muted-foreground font-medium uppercase text-[10px]">Unified PostgreSQL Financial Gateway</p>
                </div>
                <Button variant="outline" onClick={resetPOS} className="font-bold border-2">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Station
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-xl">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> Identify Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", isSearching && "animate-pulse")} />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-16 pl-12 text-xl font-bold uppercase border-4 border-muted focus:border-primary transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute w-full mt-2 bg-background border-2 rounded-xl shadow-2xl z-50 overflow-hidden">
                                            {searchResults.map(u => (
                                                <div key={u.id} onClick={() => handleSelectUser(u)} className="p-4 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b last:border-0">
                                                    <div><p className="font-black text-primary uppercase">{u.full_name}</p><p className="text-xs font-bold text-muted-foreground">{u.email}</p></div>
                                                    <Badge className="h-8 px-4 text-sm font-black italic tracking-tighter uppercase">{u.mailbox_number}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn("p-8 rounded-2xl shadow-inner flex flex-col md:flex-row items-center justify-between gap-6 transition-all", Number(selectedUser.wallet_balance) < 0 ? "bg-red-500 text-white" : "bg-primary text-primary-foreground")}>
                                    <div>
                                        <div className="flex items-center gap-3"><p className="text-4xl font-black italic uppercase tracking-tighter">{selectedUser.full_name}</p><Badge className="bg-white/20 text-white uppercase text-[10px] font-black italic">{selectedUser.mailbox_number}</Badge></div>
                                        <p className="font-bold opacity-80 uppercase tracking-widest text-[10px] mt-1">{selectedUser.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase opacity-60">Ledger Standing</p>
                                        <div className="flex items-center justify-end gap-2">
                                            {Number(selectedUser.wallet_balance) < 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                                            <span className="text-4xl font-black italic tracking-tighter">JMD ${Math.abs(Number(selectedUser.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-white hover:bg-white/10 h-12 w-12 rounded-full"><X className="h-6 w-6" /></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl overflow-hidden min-h-[400px]">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> Unpaid Registry Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-xs font-black uppercase tracking-widest">Scanning Registry...</p></div>
                            ) : !selectedUser ? (
                                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-30 italic"><Search className="h-12 w-12 mb-2" /><p>Select a customer to load items.</p></div>
                            ) : userInvoices.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center p-8"><div className="bg-green-100 p-6 rounded-full"><CheckCircle2 className="h-12 w-12 text-green-600" /></div><div><p className="text-2xl font-black italic uppercase tracking-tighter">Registry Clean</p><p className="text-muted-foreground text-sm font-medium">All items fully settled in Supabase.</p></div></div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[50px] pl-6"></TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Invoice #</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userInvoices.map((inv) => (
                                            <TableRow key={inv.id} className={cn("hover:bg-primary/5 cursor-pointer h-20", selectedInvoices.has(inv.id) && "bg-primary/10")} onClick={() => toggleInvoice(inv.id)}>
                                                <TableCell className="pl-6"><Checkbox checked={selectedInvoices.has(inv.id)} onCheckedChange={() => toggleInvoice(inv.id)} className="h-6 w-6 border-2" /></TableCell>
                                                <TableCell className="font-mono font-black text-primary uppercase text-sm">{inv.invoice_number}</TableCell>
                                                <TableCell className="text-[10px] font-medium opacity-60">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right pr-6 font-black text-xl tracking-tighter">JMD ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4">
                    <Card className="border-none shadow-2xl bg-zinc-950 text-zinc-100 sticky top-24">
                        <CardHeader className="pb-8"><CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Checkout Terminal</CardTitle></CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <div className="text-center space-y-2 py-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Authorized Grand Total</p>
                                    <div className="flex items-center justify-center gap-2"><span className="text-2xl font-bold opacity-30 text-primary">JMD</span><span className="text-6xl font-black italic tracking-tighter text-white">${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Form of Tender</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-2">
                                    {['Cash', 'Card', 'Transfer'].map(m => (
                                        <Label key={m} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 border-white/10 cursor-pointer hover:bg-white/5 transition-colors", paymentMethod === m && "border-primary bg-primary/10 text-primary")}>
                                            {m === 'Cash' ? <Banknote /> : m === 'Card' ? <CreditCard /> : <Building2 />}
                                            <span className="text-[9px] font-black uppercase italic mt-1">{m}</span><RadioGroupItem value={m} className="sr-only" />
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                        <CardFooter className="pb-8">
                            <Button onClick={() => setIsCheckoutOpen(true)} disabled={selectedInvoices.size === 0} className="w-full h-20 text-2xl font-black italic uppercase tracking-tighter shadow-2xl">
                                Finalize Settlement
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Transaction Confirmation</DialogTitle>
                    </DialogHeader>
                    {!checkoutComplete ? (
                        <div className="space-y-6 py-6">
                            <div className="p-6 rounded-2xl bg-muted/30 border-2 border-dashed flex flex-col items-center gap-4 text-center">
                                <DollarSign className="h-12 w-12 text-primary animate-bounce" />
                                <div><p className="text-[10px] font-black uppercase opacity-60">Confirm Receipt of Funds</p><p className="text-4xl font-black tracking-tighter">JMD ${calculatedSelectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                            </div>
                            <Button onClick={handleProcessPayment} disabled={isProcessing} className="w-full h-14 font-black uppercase italic tracking-tight">{isProcessing ? <Loader2 className="animate-spin" /> : "Authorize Settlement"}</Button>
                        </div>
                    ) : (
                        <div className="space-y-6 py-8 text-center">
                            <div className="bg-green-500 h-24 w-24 rounded-full flex items-center justify-center mx-auto shadow-xl"><CheckCircle2 className="h-16 w-12 text-white" /></div>
                            <div><p className="text-3xl font-black italic uppercase tracking-tighter">Registry Cleared</p><p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Funds Received & Account Credited</p></div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button className="h-14 font-black uppercase" onClick={handlePrintReceipt} disabled={isGeneratingPdf}>{isGeneratingPdf ? <Loader2 className="animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />} Receipt</Button>
                                <Button variant="outline" className="h-14 font-black border-2 uppercase" onClick={resetPOS}>Next Client</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
