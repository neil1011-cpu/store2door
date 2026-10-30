
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
  Package, 
  CheckCircle2, 
  Loader2, 
  X,
  CreditCard,
  Banknote,
  Building2,
  Trash2,
  FileDown,
  Receipt,
  Calculator,
  Gavel,
  ShieldCheck,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20 },
  LAPTOPS_TABLETS: { duty: 0 },
  COMPUTERS: { duty: 0 },
  CELL_PHONES: { duty: 0.20 },
  CLOTHING: { duty: 0.20 },
  SHOES: { duty: 0.20 },
  AUTO_PARTS: { duty: 0.30 },
  COSMETICS: { duty: 0.20 },
  BOOKS: { duty: 0 },
  ELECTRONICS_OTHER: { duty: 0.20 },
};

const USD_TO_JMD_RATE = 156; 
const DE_MINIMIS_THRESHOLD = 100;
const INSURANCE_RATE = 0.015;
const SCF_RATE = 0.003;

type Category = keyof typeof CUSTOMS_RATES;

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
    const [manualDuties, setManualDuties] = useState<Record<string, number>>({});
    
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const [cashReceived, setCashReceived] = useState<string>('');
    const [receiptData, setReceiptData] = useState<any | null>(null);

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
            } catch (err: any) {
                console.warn("Search Error:", err.message);
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
            const { data: shipmentsData, error } = await supabase.from('shipments')
                    .select('*')
                    .eq('profile_id', userId)
                    .eq('status', 'Ready for pick up')
                    .eq('payment_status', 'Unpaid')
                    .order('created_at', { ascending: false });

            if (error) throw error;
            
            setUserInvoices(shipmentsData || []);
            
            // Logic: Account Standing strictly reflects items "Ready for Pickup" and "Unpaid"
            const totalReady = (shipmentsData || []).reduce((sum, inv) => {
                return sum + (Number(inv.total_cost_jmd) || calculateShippingCost(Number(inv.weight_lbs) || 0));
            }, 0);
            
            setAccountStanding(totalReady);

        } catch (error: any) {
            toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoadingInvoices(false);
        }
    }, [supabase, toast]);

    const handleSelectUser = (user: any) => {
        setSearchTerm('');
        setSearchResults([]);
        setSelectedInvoices(new Set());
        setManualDuties({});
        setCheckoutComplete(false);
        setCashReceived('');
        
        setSelectedUser(user);
        refreshUserData(user.id);
    };

    const toggleInvoice = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const next = new Set(selectedInvoices);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedInvoices(next);
    };

    const calculatedSelectedTotal = useMemo(() => {
        return userInvoices
            .filter(inv => selectedInvoices.has(inv.id))
            .reduce((sum, inv) => {
                const shipping = Number(inv.total_cost_jmd) || calculateShippingCost(Number(inv.weight_lbs) || 0);
                const duty = manualDuties[inv.id] || 0;
                return sum + shipping + duty;
            }, 0);
    }, [userInvoices, selectedInvoices, manualDuties]);

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

            const { error: ledgerError } = await supabase.from('financial_ledger').insert({
                profile_id: selectedUser.id,
                amount: totalToSettle, 
                transaction_type: 'payment',
                description: `POS Payment: ${trackingNumbers.join(', ')} via ${paymentMethod}`
            });

            if (ledgerError) throw ledgerError;

            setReceiptData({
                customer: selectedUser,
                items: itemsToSnap.map(it => ({
                    ...it,
                    duty_applied: manualDuties[it.id] || 0
                })),
                total: totalToSettle,
                method: paymentMethod,
                cashReceived: paymentMethod === 'Cash' ? parseFloat(cashReceived) : null,
                changeDue: paymentMethod === 'Cash' ? changeDue : null,
                date: new Date()
            });

            setCheckoutComplete(true);
            toast({ title: "Payment Secured" });
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
        setManualDuties({});
        setCheckoutComplete(false);
        setIsCheckoutOpen(false);
        setReceiptData(null);
        setSearchTerm('');
        setCashReceived('');
        setAccountStanding(0);
    };

    return (
        <div className="flex flex-col gap-6 max-w-full mx-auto pb-20">
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
                            {receiptData.items.map((item: any) => (
                                <div key={item.id} className="flex flex-col py-2 border-b border-black/5">
                                    <div className="flex justify-between">
                                        <div className="flex flex-col">
                                            <span className="uppercase font-bold">{item.tracking_number}</span>
                                        </div>
                                        <span className="font-black">${Number(item.total_cost_jmd || calculateShippingCost(item.weight_lbs)).toLocaleString()}</span>
                                    </div>
                                    {item.duty_applied > 0 && (
                                        <div className="flex justify-between text-[9px] italic opacity-60">
                                            <span>+ Customs Duty</span>
                                            <span>$ {item.duty_applied.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-2xl font-black italic tracking-tighter mt-6">
                            <span>TOTAL:</span>
                            <span>$ {receiptData.total.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-primary">Station POS</h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Branch Terminal • Secure Checkout</p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPOS} className="font-black uppercase italic border-2">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Transaction
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border shadow-md rounded-2xl">
                        <CardHeader className="bg-muted/30 py-3 border-b rounded-t-2xl">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <UserCheck className="h-3.5 w-3.5" /> 01. IDENTIFY ACCOUNT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {!selectedUser ? (
                                <div className="relative">
                                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", isSearching && "animate-pulse")} />
                                    <Input 
                                        placeholder="SEARCH NAME, EMAIL, OR MAILBOX #..." 
                                        className="h-14 pl-12 text-xl font-bold uppercase border-2 rounded-xl"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute w-full mt-2 bg-popover border-2 rounded-xl shadow-2xl z-[100] overflow-hidden divide-y">
                                            {searchResults.map(u => (
                                                <div key={u.id} onClick={() => handleSelectUser(u)} className="p-4 hover:bg-accent cursor-pointer flex items-center justify-between">
                                                    <div>
                                                        <p className="font-black text-lg text-primary uppercase italic">{u.full_name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{u.email}</p>
                                                    </div>
                                                    <Badge className="font-mono font-bold">{u.mailbox_number}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn("p-6 rounded-xl shadow-lg flex items-center justify-between gap-6", accountStanding > 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4">
                                            <p className="text-3xl font-black italic uppercase tracking-tighter truncate">{selectedUser.full_name}</p>
                                            <Badge variant="secondary" className="uppercase text-xs font-black italic h-7">{selectedUser.mailbox_number}</Badge>
                                        </div>
                                    </div>
                                    <div className="text-right bg-black/10 p-4 rounded-xl border border-white/10 min-w-[200px]">
                                        <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Current Ready Total</p>
                                        <span className="text-2xl font-black italic tracking-tighter">JMD ${accountStanding.toLocaleString()}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} className="text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border shadow-md overflow-hidden rounded-2xl min-h-[400px]">
                        <CardHeader className="bg-muted/30 py-3 border-b">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                                <Package className="h-3.5 w-3.5" /> 02. SELECT READY PARCELS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInvoices ? (
                                <div className="h-64 flex flex-col items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
                            ) : !selectedUser ? (
                                <div className="h-64 flex flex-col items-center justify-center opacity-10 italic"><p className="text-lg font-black uppercase tracking-[0.3em]">Awaiting Identity</p></div>
                            ) : userInvoices.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center p-6"><CheckCircle2 className="h-12 w-12 text-green-500 opacity-20" /><p className="text-xl font-black italic uppercase opacity-40">No Parcels Awaiting Pickup</p></div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 h-14">
                                        <TableRow>
                                            <TableHead className="w-[50px] pl-6"></TableHead>
                                            <TableHead className="text-[9px] font-black uppercase">Tracking ID</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-right">Freight (JMD)</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-right">Duty (JMD)</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-right pr-8">Total (JMD)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userInvoices.map((ship) => {
                                            const weight = Number(ship.weight_lbs) || 0;
                                            const freight = Number(ship.total_cost_jmd) || calculateShippingCost(weight);
                                            const duty = manualDuties[ship.id] || 0;
                                            const total = freight + duty;

                                            return (
                                                <TableRow key={ship.id} className={cn("hover:bg-accent cursor-pointer border-b h-24", selectedInvoices.has(ship.id) && "bg-primary/5")} onClick={() => toggleInvoice(ship.id)}>
                                                    <TableCell className="pl-6">
                                                        <Checkbox 
                                                            checked={selectedInvoices.has(ship.id)} 
                                                            onCheckedChange={() => toggleInvoice(ship.id)} 
                                                            className="h-6 w-6 border-2" 
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono font-black text-primary uppercase text-sm italic">{ship.tracking_number}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase truncate max-w-[100px]">{ship.contents || 'General Package'}</p>
                                                            <Badge variant="outline" className="h-4 text-[7px] px-1">{weight} LBS</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black italic text-sm">JMD ${freight.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            {duty > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-[8px] font-black border-2 border-indigo-200">+ ${duty.toLocaleString()}</Badge>}
                                                            <POSCustomsDialog 
                                                                shipment={ship} 
                                                                onApply={(amt) => setManualDuties(prev => ({ ...prev, [ship.id]: amt }))} 
                                                                currentDuty={duty} 
                                                                disabled={!selectedInvoices.has(ship.id)} 
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 font-black text-xl italic text-primary">JMD ${total.toLocaleString()}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 sticky top-24">
                    <Card className="border-none shadow-2xl bg-indigo-50/30 rounded-[2rem] overflow-hidden border-t-4 border-indigo-500">
                        <CardHeader className="bg-background/40 pb-6 pt-8 px-8 border-b border-indigo-100">
                            <CardTitle className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-3 italic"><Receipt className="h-4 w-4" /> SETTLEMENT AUTHORITY</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 px-8 py-8">
                            <div className="text-center space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Selected Total</p>
                                <span className="text-5xl font-black italic tracking-tighter">JMD ${calculatedSelectedTotal.toLocaleString()}</span>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Payment Method</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-3 gap-2">
                                    {['Cash', 'Card', 'Transfer'].map(m => (
                                        <Label key={m} className={cn("flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all", paymentMethod === m ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "text-muted-foreground border-transparent")}>
                                            <div className="mb-2">{m === 'Cash' ? <Banknote /> : m === 'Card' ? <CreditCard /> : <Building2 />}</div>
                                            <span className="text-[9px] font-black uppercase italic">{m}</span>
                                            <RadioGroupItem value={m} className="sr-only" />
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>

                            {paymentMethod === 'Cash' && selectedInvoices.size > 0 && (
                                <div className="space-y-4 bg-background/60 p-6 rounded-2xl border border-indigo-100">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-500 ml-1">Tendered (JMD)</Label>
                                        <Input type="number" className="h-14 text-2xl font-black rounded-xl border-2" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                        <span className="text-[8px] font-black uppercase">Change Due</span>
                                        <span className="text-xl font-black italic">JMD ${changeDue.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pb-10 pt-4 px-8">
                            <Button onClick={() => setIsCheckoutOpen(true)} disabled={selectedInvoices.size === 0 || (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < calculatedSelectedTotal))} className="w-full h-20 text-2xl font-black italic uppercase shadow-2xl rounded-2xl"><ShoppingCart className="h-6 w-6 mr-3" /> Process Checkout</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-xl p-0 rounded-[2rem] border-4">
                    {!checkoutComplete ? (
                        <div className="flex flex-col">
                            <div className="p-8 bg-muted/30 border-b-2"><DialogHeader><DialogTitle className="text-3xl font-black italic uppercase text-center">Confirm Authorization</DialogTitle></DialogHeader></div>
                            <div className="p-10 space-y-6">
                                <div className="p-8 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col items-center gap-6 text-center">
                                    <div><p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Verify Registry Impact</p><p className="text-6xl font-black italic tracking-tighter text-primary">JMD ${calculatedSelectedTotal.toLocaleString()}</p></div>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-16 text-lg font-black uppercase italic border-2 rounded-xl">Cancel</Button>
                                    <Button onClick={handleProcessPayment} disabled={isProcessing} className="flex-[2] h-16 text-2xl font-black uppercase italic rounded-xl shadow-xl">{isProcessing ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <CheckCircle2 className="mr-3 h-6 w-6" />} Clear & Settle</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-8 animate-in zoom-in duration-300">
                            <div className="bg-green-500 h-24 w-24 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl transform rotate-12"><CheckCircle2 className="h-12 w-12 text-white" /></div>
                            <div><p className="text-5xl font-black italic uppercase text-primary">Payment Secured</p><p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-[10px] mt-4 opacity-60">REGISTRY UPDATED • INVENTORY RELEASED</p></div>
                            <div className="grid grid-cols-2 gap-4 pt-6">
                                <Button className="h-16 text-lg font-black uppercase italic rounded-xl shadow-xl" onClick={handlePrintReceipt} disabled={isGeneratingPdf}>{isGeneratingPdf ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <FileDown className="mr-2 h-5 w-5" />} Print Receipt</Button>
                                <Button variant="outline" className="h-16 text-lg font-black border-2 uppercase italic rounded-xl" onClick={resetPOS}>Next Client <UserCheck className="ml-2 h-5 w-5" /></Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            
            <div className="mt-auto pt-10 text-center opacity-40">
                <Link href="https://neilussolutions.com" target="_blank" className="text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">
                    Developed by NEILUS SOLUTIONS
                </Link>
            </div>
        </div>
    );
}

function POSCustomsDialog({ shipment, onApply, currentDuty, disabled }: { shipment: any, onApply: (amt: number) => void, currentDuty: number, disabled: boolean }) {
    const [open, setOpen] = useState(false);
    const [itemValue, setItemValue] = useState('');
    const [category, setCategory] = useState<Category>('GENERAL');
    const [calculatedDuty, setCalculatedDuty] = useState(0);

    const handleCalculate = useCallback(() => {
        const val = parseFloat(itemValue) || 0;
        if (val <= DE_MINIMIS_THRESHOLD) {
            setCalculatedDuty(0);
            return;
        }

        const insurance = val * INSURANCE_RATE;
        const shippingUsd = (Number(shipment.total_cost_jmd) || calculateShippingCost(shipment.weight_lbs)) / USD_TO_JMD_RATE;
        const cif = val + insurance + shippingUsd;
        const rates = CUSTOMS_RATES[category];
        const importDuty = cif * rates.duty;
        const scf = cif * SCF_RATE;
        const getCAF = (v: number) => v <= 500 ? 2500 : v <= 1000 ? 5000 : v <= 2500 ? 10000 : v <= 5000 ? 20000 : 40000;
        const totalDutyJmd = (importDuty + scf) * USD_TO_JMD_RATE + getCAF(val);
        setCalculatedDuty(Math.ceil(totalDutyJmd));
    }, [itemValue, category, shipment]);

    useEffect(() => { if (open) handleCalculate(); }, [itemValue, category, open, handleCalculate]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={disabled} 
                    className={cn("h-7 text-[8px] font-black uppercase italic border-2", currentDuty > 0 && "border-indigo-500 text-indigo-600")}
                    onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                >
                    <Calculator className="h-3 w-3 mr-1" />
                    {currentDuty > 0 ? "Adjust Duty" : "Customs Authority"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl border-4" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Gavel className="h-6 w-6 text-indigo-500" /> JCA DUTY CALCULATOR</DialogTitle></DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-60">Item Market Value (USD)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                <Input type="number" value={itemValue} onChange={e => setItemValue(e.target.value)} className="h-12 pl-10 text-lg font-black border-2" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-60">JCA Tariff Category</Label><Select onValueChange={(v: Category) => setCategory(v)} defaultValue={category}><SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERAL">General Goods (20%)</SelectItem><SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0%)</SelectItem><SelectItem value="CELL_PHONES">Cell Phones (20%)</SelectItem><SelectItem value="AUTO_PARTS">Auto Parts (30%)</SelectItem><SelectItem value="COSMETICS">Cosmetics (20%)</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="p-6 rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 text-center"><p className="text-[8px] font-black uppercase opacity-40 mb-2">Landed Duty Estimate (JMD)</p><p className="text-4xl font-black italic tracking-tighter text-indigo-700">JMD $ {calculatedDuty.toLocaleString()}</p></div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" className="h-12 font-bold uppercase w-full" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={(e) => { e.stopPropagation(); onApply(calculatedDuty); setOpen(false); }} className="flex-1 h-12 font-black uppercase italic shadow-xl bg-indigo-600 hover:bg-indigo-500 text-white"><ShieldCheck className="h-4 w-4 mr-2" />Authorize Adjustment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
