
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft, Loader2, Download, FileText, Zap, RefreshCw, Eye, CheckCircle2, AlertCircle, Weight, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';

export default function PreAlertsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [preAlerts, setPreAlerts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAlert, setNewAlert] = useState({ profileId: '', trackingNumber: '', contents: '', weight: '' });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [paRes, usersRes] = await Promise.all([
                supabase.from('pre_alerts').select('*, profiles(full_name)').eq('status', 'Pending').order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*').order('full_name', { ascending: true })
            ]);
            setPreAlerts(paRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error: any) {
            toast({ title: "Fetch Failure", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAlert = async () => {
        if (!newAlert.profileId || !newAlert.trackingNumber) return;
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
            toast({ title: "Pre-Alert Established" });
            setIsAddOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProcessIntake = async (alert: any, verifiedWeight: number, calculatedCost: number) => {
        try {
            // 1. Create Shipment record
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

            // 2. Generate Invoice record
            await supabase.from('invoices').insert({
                profile_id: alert.profile_id,
                amount: calculatedCost,
                status: 'Unpaid',
                invoice_number: `INV-${alert.tracking_number.slice(-4)}-${Date.now().toString().slice(-4)}`
            });

            // 3. Record in Financial Ledger (Auto-syncs profile.wallet_balance via DB trigger)
            await supabase.from('financial_ledger').insert({
                profile_id: alert.profile_id,
                amount: -calculatedCost, // Negative for debt/charge
                transaction_type: 'shipping_fee',
                description: `Shipping Fee: ${alert.tracking_number} (${verifiedWeight} lbs)`
            });

            // 4. Update Pre-Alert status
            await supabase.from('pre_alerts').update({ status: 'Processed' }).eq('id', alert.id);

            // 5. Audit Log
            await supabase.from('system_logs').insert({
                log_type: 'intake_processed',
                description: `Package intake complete for ${alert.tracking_number}. Weight: ${verifiedWeight} lbs. Cost: JMD $${calculatedCost.toLocaleString()}`,
                actor_id: (await supabase.auth.getUser()).data.user?.id,
                metadata: { trackingNumber: alert.tracking_number, profileId: alert.profile_id }
            });

            toast({ title: "Intake Secured", description: "Shipment active and client ledger charged." });
            fetchData();
        } catch (error: any) {
            toast({ title: "Intake Failure", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Pre-Alert Queue</h1>
                    <p className="text-muted-foreground font-medium uppercase text-[10px]">Universal Registry Monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} className="font-bold border-2"><RefreshCw className="mr-2 h-4 w-4" /> Refresh Registry</Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild><Button className="font-black uppercase italic shadow-lg"><PlusCircle className="mr-2 h-4 w-4" /> New Alert</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader><DialogTitle className="uppercase italic text-center">Manual Registry Entry</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase opacity-60">Customer Identity</Label>
                                    <Select value={newAlert.profileId} onValueChange={(v) => setNewAlert({...newAlert, profileId: v})}>
                                        <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select account" /></SelectTrigger>
                                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Tracking #</Label><Input value={newAlert.trackingNumber} onChange={e => setNewAlert({...newAlert, trackingNumber: e.target.value.toUpperCase()})} className="h-11 border-2 font-mono" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label><Input type="number" value={newAlert.weight} onChange={e => setNewAlert({...newAlert, weight: e.target.value})} className="h-11 border-2" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label><Input value={newAlert.contents} onChange={e => setNewAlert({...newAlert, contents: e.target.value})} className="h-11 border-2" /></div>
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleCreateAlert} disabled={isSubmitting} className="w-full h-12 font-black uppercase italic shadow-xl">{isSubmitting ? <Loader2 className="animate-spin" /> : "Authorize Alert"}</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" asChild className="font-bold border-2"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link></Button>
                </div>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Incoming Logistics Documentation</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Verify and process customer-submitted pre-alerts for clearance.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-12">
                                <TableHead className="pl-6 text-[10px] font-black uppercase">Customer</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Tracking ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Weight</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {preAlerts.map(alert => (
                                <TableRow key={alert.id} className="hover:bg-primary/5 transition-colors h-20">
                                    <TableCell className="pl-6">
                                        <div className="flex flex-col"><span className="font-black text-sm uppercase">{alert.profiles?.full_name}</span><span className="text-[9px] font-bold opacity-60 uppercase">{alert.contents || 'No Description'}</span></div>
                                    </TableCell>
                                    <TableCell className="font-mono font-black text-primary uppercase text-sm">{alert.tracking_number}</TableCell>
                                    <TableCell className="text-xs font-bold uppercase">{alert.weight_lbs} LBS</TableCell>
                                    <TableCell className="text-[10px] font-medium opacity-60">{new Date(alert.submission_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {alert.invoice_url && (
                                                <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase italic text-[10px] border-2"><Link href={alert.invoice_url} target="_blank"><FileText className="mr-2 h-3.5 w-3.5" /> View Receipt</Link></Button>
                                            )}
                                            <IntakeDialog alert={alert} onProcess={handleProcessIntake} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {preAlerts.length === 0 && <TableRow><TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 italic">Pre-alert queue is empty.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function IntakeDialog({ alert, onProcess }: { alert: any, onProcess: (a: any, w: number, c: number) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [weight, setWeight] = useState(alert.weight_lbs?.toString() || '');
    const [cost, setCost] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const w = parseFloat(weight);
        if (!isNaN(w) && w > 0) {
            setIsCalculating(true);
            const calculated = calculateShippingCost(w);
            setCost(calculated.toString());
            setIsCalculating(false);
        }
    }, [weight]);

    const handleConfirm = async () => {
        setIsProcessing(true);
        await onProcess(alert, parseFloat(weight), parseFloat(cost));
        setIsProcessing(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm" className="h-9 font-black uppercase italic text-[10px] px-6">Process Intake</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Authorize Global Intake</DialogTitle></DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Verified Weight (LBS)</Label>
                            <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-14 text-2xl font-black border-2" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Calculated Cost (JMD $)</Label>
                            <div className="relative">
                                <Input type="number" value={cost} onChange={e => setCost(e.target.value)} className="h-14 text-2xl font-black border-2 pl-14" />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs opacity-40">JMD $</span>
                                {isCalculating && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                            </div>
                        </div>
                    </div>
                    <Alert className="bg-amber-50 border-amber-200">
                        <DollarSign className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                            This intake will instantly debit **JMD ${parseFloat(cost || '0').toLocaleString()}** from client credit.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={isProcessing || !cost} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Authorize Processing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
