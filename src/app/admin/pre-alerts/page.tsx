'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft, Loader2, FileText, Zap, RefreshCw, CheckCircle2, DollarSign, Clock, Trash2, Eye, Download, AlertCircle, ArrowRight, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

export default function PreAlertsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [preAlerts, setPreAlerts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAlert, setNewAlert] = useState({ profileId: '', trackingNumber: '', contents: '', weight: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [paRes, usersRes] = await Promise.all([
                supabase.from('pre_alerts').select('*, profiles(full_name)').order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*').order('full_name', { ascending: true })
            ]);

            if (paRes.error) throw paRes.error;
            if (usersRes.error) throw usersRes.error;

            setPreAlerts(paRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error: any) {
            console.error("[PRE-ALERTS FETCH ERROR]", error);
            toast({ title: "Registry Sync Failure", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [supabase, toast]);

    useEffect(() => {
        fetchData();
        
        const channel = supabase.channel('pre-alert-queue-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_alerts' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData, supabase]);

    const handleRunCleanup = async () => {
        setIsCleaning(true);
        try {
            const res = await fetch('/api/admin/maintenance/cleanup-invoices', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Cleanup failed');
            toast({ title: "Maintenance Complete", description: `Purged ${data.purgedCount} expired invoice(s).` });
            fetchData();
        } catch (err: any) {
            toast({ title: "Maintenance Error", description: err.message, variant: "destructive" });
        } finally {
            setIsCleaning(false);
        }
    };

    const handleCreateAlert = async () => {
        if (!newAlert.profileId || !newAlert.trackingNumber) {
            toast({ title: "Validation Error", description: "Customer and Tracking # are required.", variant: "destructive" });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('pre_alerts').insert({
                profile_id: newAlert.profileId,
                tracking_number: newAlert.trackingNumber.toUpperCase(),
                contents: newAlert.contents,
                weight_lbs: parseFloat(newAlert.weight) || 0,
                status: 'Pending'
            });

            if (error) throw error;

            toast({ title: "Pre-Alert Established", description: "The manual entry is now live in the queue." });
            setIsAddOpen(false);
            setNewAlert({ profileId: '', trackingNumber: '', contents: '', weight: '' });
            fetchData();
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProcessIntake = async (alert: any, verifiedWeight: number, calculatedCost: number) => {
        try {
            // 1. Create Shipment
            const { data: shipment, error: shipError } = await supabase.from('shipments').insert({
                profile_id: alert.profile_id,
                tracking_number: alert.tracking_number,
                contents: alert.contents,
                weight_lbs: verifiedWeight,
                total_cost_jmd: calculatedCost,
                status: 'Processed',
                payment_status: 'Unpaid'
            }).select().single();

            if (shipError) throw shipError;

            // 2. Issue Invoice
            await supabase.from('invoices').insert({
                profile_id: alert.profile_id,
                amount: calculatedCost,
                status: 'Unpaid',
                invoice_number: `INV-${alert.tracking_number.slice(-4)}-${Date.now().toString().slice(-4)}`
            });

            // 3. Charge Ledger
            await supabase.from('financial_ledger').insert({
                profile_id: alert.profile_id,
                amount: -calculatedCost,
                transaction_type: 'shipping_fee',
                description: `Shipping Fee: ${alert.tracking_number}`
            });

            // 4. Mark documentation as processed
            await supabase.from('pre_alerts').update({ status: 'Processed' }).eq('id', alert.id);

            // 5. System Log
            await supabase.from('system_logs').insert({
                log_type: 'intake_processed',
                description: `Package intake complete for ${alert.tracking_number}. Documentation verified.`,
                actor_id: (await supabase.auth.getUser()).data.user?.id
            });

            toast({ title: "Intake Secured" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Intake Failure", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading && preAlerts.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Registry...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Pre-Alert Hub</h1>
                    <p className="text-muted-foreground font-medium uppercase text-[10px]">Document Registry & Intake Station</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRunCleanup} disabled={isCleaning} className="font-bold border-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                        {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />} 
                        Retention Cleanup
                    </Button>
                    <Button variant="outline" onClick={fetchData} className="font-bold border-2"><RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh Feed</Button>
                    
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black uppercase italic shadow-lg">
                                <PlusCircle className="mr-2 h-4 w-4" /> New Alert
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="uppercase italic tracking-tighter text-center text-2xl">Manual Registry Entry</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase opacity-60">Customer Identity</Label>
                                    <Select 
                                        value={newAlert.profileId} 
                                        onValueChange={(v) => setNewAlert({...newAlert, profileId: v})}
                                    >
                                        <SelectTrigger className="h-11 border-2">
                                            <SelectValue placeholder="Select customer profile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.length > 0 ? users.map(u => (
                                                <SelectItem key={u.id} value={u.id} className="font-bold uppercase text-xs">
                                                    {u.full_name} ({u.mailbox_number})
                                                </SelectItem>
                                            )) : (
                                                <div className="p-4 text-center text-xs opacity-40 italic">No users found.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase opacity-60">Tracking #</Label>
                                    <Input 
                                        placeholder="e.g. 1Z..."
                                        value={newAlert.trackingNumber} 
                                        onChange={e => setNewAlert({...newAlert, trackingNumber: e.target.value.toUpperCase()})} 
                                        className="h-11 border-2 font-mono uppercase" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label>
                                        <Input 
                                            type="number" 
                                            value={newAlert.weight} 
                                            onChange={e => setNewAlert({...newAlert, weight: e.target.value})} 
                                            className="h-11 border-2" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label>
                                        <Input 
                                            placeholder="Shoes, etc."
                                            value={newAlert.contents} 
                                            onChange={e => setNewAlert({...newAlert, contents: e.target.value})} 
                                            className="h-11 border-2" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    onClick={handleCreateAlert} 
                                    disabled={isSubmitting || !newAlert.profileId} 
                                    className="w-full h-12 font-black uppercase italic shadow-xl"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} 
                                    Authorize Manual Alert
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" asChild className="font-bold border-2">
                        <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
                    </Button>
                </div>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Incoming Documentation Stream
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-12">
                                <TableHead className="pl-6 text-[10px] font-black uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Tracking ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Retention</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {preAlerts.map(alert => {
                                const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(alert.submission_date).getTime()) / (1000 * 60 * 60 * 24)));
                                return (
                                    <TableRow key={alert.id} className={cn("hover:bg-primary/5 transition-colors h-20", alert.status === 'Processed' && "opacity-60")}>
                                        <TableCell className="pl-6">
                                            <Badge variant={alert.status === 'Processed' ? 'secondary' : 'default'} className="uppercase text-[8px] font-black italic">
                                                {alert.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm uppercase">{alert.profiles?.full_name || 'Legacy Account'}</span>
                                                <span className="text-[9px] font-bold opacity-60 uppercase truncate max-w-[150px]">{alert.contents || 'No Description'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-black text-primary uppercase text-sm">{alert.tracking_number}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className={cn("h-3 w-3", daysLeft < 5 ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                                                <span className={cn("text-[10px] font-bold uppercase", daysLeft < 5 && "text-red-600")}>{daysLeft} Days Left</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {alert.invoice_url ? (
                                                    <InvoicePreviewDialog url={alert.invoice_url} trackingNumber={alert.tracking_number} alert={alert} onProcess={handleProcessIntake} />
                                                ) : (
                                                    <Badge variant="outline" className="opacity-30 uppercase text-[8px] h-9 px-4 flex items-center">No Document</Badge>
                                                )}
                                                {alert.status === 'Pending' && !alert.invoice_url && (
                                                    <IntakeDialog alert={alert} onProcess={handleProcessIntake} />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {preAlerts.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 italic">
                                        Pre-alert registry is currently clean.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function InvoicePreviewDialog({ url, trackingNumber, alert, onProcess }: { url: string, trackingNumber: string, alert: any, onProcess: (a: any, w: number, c: number) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 font-black uppercase italic text-[10px] border-2">
                    <Eye className="mr-2 h-3.5 w-3.5" /> View Registry Document
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Documentation Review</DialogTitle>
                            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Tracking ID: {trackingNumber}</DialogDescription>
                        </div>
                        <Badge className="bg-primary text-[10px] font-black uppercase italic h-7 px-4">Verification Terminal</Badge>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-8 bg-muted/40 p-4 flex items-center justify-center relative min-h-[500px]">
                        <div className="relative w-full h-full rounded-xl overflow-hidden border shadow-inner bg-white">
                            <Image 
                                src={url} 
                                alt="Commercial Invoice" 
                                fill 
                                className="object-contain"
                                data-ai-hint="invoice document"
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-4 bg-background p-6 border-l flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-primary/5 border border-dashed border-primary/20 space-y-1">
                                <p className="text-[9px] font-black uppercase opacity-60">Customer Name</p>
                                <p className="font-bold uppercase tracking-tight">{alert.profiles?.full_name}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-primary/5 border border-dashed border-primary/20 space-y-1">
                                <p className="text-[9px] font-black uppercase opacity-60">Contents Reported</p>
                                <p className="font-bold uppercase tracking-tight text-xs italic">"{alert.contents || 'No description'}"</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-end gap-4">
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                                    Verify document details match package contents.
                                </AlertDescription>
                            </Alert>
                            
                            <div className="grid grid-cols-1 gap-2">
                                <Button variant="outline" className="font-black uppercase h-12 border-2" asChild>
                                    <Link href={url} target="_blank" download><Download className="mr-2 h-4 w-4" /> Download Original</Link>
                                </Button>
                                {alert.status === 'Pending' && (
                                    <IntakeDialog alert={alert} onProcess={onProcess} triggerLabel="Verify & Create Shipment" className="w-full h-14 text-lg" onIntakeSuccess={() => setOpen(false)} />
                                )}
                                {alert.status === 'Processed' && (
                                    <Button disabled className="h-14 font-black uppercase opacity-40"><CheckCircle2 className="mr-2 h-5 w-5" /> Shipment Already Created</Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function IntakeDialog({ alert, onProcess, triggerLabel = "Create Shipment", className, onIntakeSuccess }: { alert: any, onProcess: (a: any, w: number, c: number) => Promise<void>, triggerLabel?: string, className?: string, onIntakeSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [weight, setWeight] = useState(alert.weight_lbs?.toString() || '');
    const [cost, setCost] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const w = parseFloat(weight);
        if (!isNaN(w) && w > 0) {
            setCost(calculateShippingCost(w).toString());
        } else {
            setCost('');
        }
    }, [weight]);

    const handleConfirm = async () => {
        if (!weight || !cost) return;
        setIsProcessing(true);
        await onProcess(alert, parseFloat(weight), parseFloat(cost));
        setIsProcessing(false);
        setOpen(false);
        onIntakeSuccess?.();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className={cn("font-black uppercase italic text-[10px]", !className && "h-9 px-6", className)}>
                    {triggerLabel === "Create Shipment" ? triggerLabel : <><Zap className="mr-2 h-4 w-4" /> {triggerLabel}</>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Authorize Global Intake</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Verified Weight (LBS)</Label>
                            <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-14 text-2xl font-black border-2" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Calculated Cost (JMD $)</Label>
                            <Input type="number" value={cost} readOnly className="h-14 text-2xl font-black border-2 bg-muted/50" />
                        </div>
                    </div>
                    <Alert className="bg-primary/5 border-primary/20">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-[10px] font-bold uppercase">This action will generate an invoice and debit the client registry.</AlertDescription>
                    </Alert>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isProcessing || !cost} 
                        className="flex-1 h-12 font-black uppercase italic shadow-xl"
                    >
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
                        Authorize Shipment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
