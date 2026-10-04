'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, ArrowLeft, Loader2, FileText, Zap, RefreshCw, CheckCircle2, Clock, Trash2, Eye, Download, AlertCircle, ArrowRight, BrainCircuit, Copy, ExternalLink, ImageIcon, ListRestart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateCustomsForm, type GenerateCustomsFormOutput } from '@/ai/flows/generate-customs-form';

const PRE_ALERT_STATUSES = ['Pending', 'Processed', 'Cancelled'];

export default function PreAlertsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [preAlerts, setPreAlerts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAlert, setNewAlert] = useState({ profileId: '', trackingNumber: '', contents: '', weight: '' });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [paRes, usersRes] = await Promise.all([
                supabase.from('pre_alerts').select('*, profiles(full_name, mailbox_number)').order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*').order('full_name', { ascending: true })
            ]);

            setPreAlerts(paRes.data || []);
            setUsers(usersRes.data || []);
            return { preAlerts: paRes.data || [], users: usersRes.data || [] };
        } catch (error: any) {
            toast({ title: "Registry Sync Failure", description: error.message, variant: "destructive" });
            return { preAlerts: [], users: [] };
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [supabase, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSyncPreAlerts = async () => {
        setIsSyncing(true);
        try {
            const { preAlerts: latestLocal, users: latestUsers } = await fetchData(true);
            const response = await fetch('/api/admin/logicware-shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hub communication failed');

            const external = data.shipments || [];
            let importedCount = 0;

            for (const s of external) {
                const status = (s.status?.name || s.status || '').toString().toLowerCase();
                if (!status.includes('pre-alert') && !status.includes('pending')) continue;

                const tracking = (s.trackingNumber || s.code || s.reference || '').toString().toUpperCase().trim();
                const rawMailbox = (s.shipper?.referenceCode || s.shipper?.code || s.referenceCode || '').toString().toUpperCase().trim();

                if (!tracking) continue;

                const exists = latestLocal.some(pa => pa.tracking_number === tracking);
                if (exists) continue;

                const hubNumeric = rawMailbox.replace(/[^0-9]/g, '');
                const profile = latestUsers.find(u => {
                    const uMailbox = (u.mailbox_number || '').toUpperCase().trim();
                    const uNumeric = uMailbox.replace(/[^0-9]/g, '');
                    return uMailbox === rawMailbox || (hubNumeric !== '' && uNumeric === hubNumeric);
                });

                if (profile) {
                    await supabase.from('pre_alerts').insert({
                        profile_id: profile.id,
                        tracking_number: tracking,
                        contents: s.contents || s.description || 'Hub Viewing Record',
                        weight_lbs: parseFloat(s.weight) || 0,
                        status: 'Pending'
                    });
                    importedCount++;
                }
            }

            toast({ title: "Viewing Feed Updated", description: `Captured ${importedCount} incoming records for viewing.` });
            fetchData();
        } catch (err: any) {
            toast({ title: "Sync Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('pre_alerts').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            toast({ title: "Status Updated" });
            fetchData(true);
        } catch (error: any) {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };

    const handleCreateAlert = async () => {
        if (!newAlert.profileId || !newAlert.trackingNumber) return;
        setIsSubmitting(true);
        try {
            await supabase.from('pre_alerts').insert({
                profile_id: newAlert.profileId,
                tracking_number: newAlert.trackingNumber.toUpperCase(),
                contents: newAlert.contents,
                weight_lbs: parseFloat(newAlert.weight) || 0,
                status: 'Pending'
            });
            toast({ title: "Pre-Alert Established" });
            setIsAddOpen(false);
            setNewAlert({ profileId: '', trackingNumber: '', contents: '', weight: '' });
            fetchData();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePreAlert = async (id: string) => {
        setIsDeleting(id);
        try {
            await supabase.from('pre_alerts').delete().eq('id', id);
            toast({ title: "Document Purged" });
            fetchData();
        } finally {
            setIsDeleting(null);
        }
    };

    const handleProcessIntake = async (alert: any, verifiedWeight: number, calculatedCost: number) => {
        try {
            await supabase.from('shipments').insert({
                profile_id: alert.profile_id,
                tracking_number: alert.tracking_number,
                contents: alert.contents,
                weight_lbs: verifiedWeight,
                total_cost_jmd: calculatedCost,
                status: 'Processed',
                payment_status: 'Unpaid',
                invoice_url: alert.invoice_url
            });
            await supabase.from('invoices').insert({
                profile_id: alert.profile_id,
                amount: calculatedCost,
                status: 'Unpaid',
                invoice_number: `INV-${alert.tracking_number.slice(-4)}-${Date.now().toString().slice(-4)}`
            });
            await supabase.from('financial_ledger').insert({
                profile_id: alert.profile_id,
                amount: -calculatedCost,
                transaction_type: 'shipping_fee',
                description: `Shipping Fee: ${alert.tracking_number}`
            });
            await supabase.from('pre_alerts').update({ status: 'Processed' }).eq('id', alert.id);
            toast({ title: "Shipment Created" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Intake Failure", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Pre-Alert Hub</h1>
                    <p className="text-muted-foreground font-medium uppercase text-[10px]">Document Viewer & Viewing Registry</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSyncPreAlerts} disabled={isSyncing} variant="outline" className="font-bold border-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                        {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-orange-500" />}
                        Sync Inbound Viewer
                    </Button>
                    <Button variant="outline" onClick={() => fetchData()} className="font-bold border-2"><RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh</Button>
                    <Button onClick={() => setIsAddOpen(true)} className="font-black uppercase italic shadow-lg"><PlusCircle className="mr-2 h-4 w-4" /> New Alert</Button>
                    <Button variant="outline" asChild className="font-bold border-2"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link></Button>
                </div>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Manual Viewing Entry</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Customer Identity</Label>
                            <Select value={newAlert.profileId} onValueChange={(v) => setNewAlert({...newAlert, profileId: v})}>
                                <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select customer profile" /></SelectTrigger>
                                <SelectContent>{users.map(u => (<SelectItem key={u.id} value={u.id} className="font-bold uppercase text-xs">{u.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Tracking #</Label><Input placeholder="e.g. 1Z..." value={newAlert.trackingNumber} onChange={e => setNewAlert({...newAlert, trackingNumber: e.target.value.toUpperCase()})} className="h-11 border-2 font-mono uppercase" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label><Input type="number" value={newAlert.weight} onChange={e => setNewAlert({...newAlert, weight: e.target.value})} className="h-11 border-2" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label><Input placeholder="Shoes, etc." value={newAlert.contents} onChange={e => setNewAlert({...newAlert, contents: e.target.value})} className="h-11 border-2" /></div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateAlert} disabled={isSubmitting || !newAlert.profileId} className="w-full h-12 font-black uppercase italic shadow-xl">{isSubmitting ? <Loader2 className="animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} Create Viewing Record</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Incoming Documentation Viewer</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-12">
                                <TableHead className="pl-6 text-[10px] font-black uppercase">Document</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Tracking ID</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {preAlerts.map(alert => (
                                <TableRow key={alert.id} className={cn("hover:bg-primary/5 transition-colors h-24", alert.status === 'Processed' && "opacity-60")}>
                                    <TableCell className="pl-6">
                                        <div className="h-16 w-16 rounded-lg bg-muted/10 border-2 border-dashed flex items-center justify-center text-muted-foreground/30">
                                            {alert.invoice_url ? (
                                                <img src={`/api/storage/view?key=${encodeURIComponent(alert.invoice_url)}`} alt="Doc" className="object-cover w-full h-full rounded-lg" onError={(e) => (e.target as any).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNCAyaDZhMiAyIDAgMCAxIDIgMnYxNmEyIDIgMCAwIDEtMiAyaC0xMmEyIDIgMCAwIDEtMi0ydi00Ii8+PHBhdGggZD0iTTggMjhWOGgzbDQgNHY3Ii8+PC9zdmc+'} />
                                            ) : <ImageIcon className="h-6 w-6" />}
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant={alert.status === 'Processed' ? 'secondary' : alert.status === 'Cancelled' ? 'outline' : 'default'} className="uppercase text-[8px] font-black italic border-2">{alert.status}</Badge></TableCell>
                                    <TableCell><p className="font-black text-sm uppercase">{alert.profiles?.full_name}</p><p className="text-[9px] font-bold opacity-60 uppercase">{alert.contents}</p></TableCell>
                                    <TableCell className="font-mono font-black text-primary uppercase text-sm">{alert.tracking_number}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <PreAlertStatusUpdateDialog 
                                              alert={alert} 
                                              onUpdate={(newStatus) => handleStatusUpdate(alert.id, newStatus)} 
                                            />
                                            <InvoicePreviewDialog url={alert.invoice_url ? `/api/storage/view?key=${alert.invoice_url}` : null} storageKey={alert.invoice_url} trackingNumber={alert.tracking_number} alert={alert} onProcess={handleProcessIntake} />
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-destructive/5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle className="font-black uppercase italic">Purge viewing record?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel className="font-bold h-12 uppercase">Abort</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePreAlert(alert.id)} className="bg-destructive font-black uppercase h-12">Authorize Purge</AlertDialogAction></AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function PreAlertStatusUpdateDialog({ alert, onUpdate }: { alert: any, onUpdate: (status: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(alert.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirm = async () => {
    setIsUpdating(true);
    await onUpdate(status);
    setIsUpdating(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-primary/5">
          <ListRestart className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Update Pre-Alert State</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase opacity-60">Status Selection</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-14 text-lg font-black border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRE_ALERT_STATUSES.map(st => (
                  <SelectItem key={st} value={st} className="font-bold uppercase text-xs">{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
          <Button 
            onClick={handleConfirm} 
            disabled={isUpdating || status === alert.status} 
            className="flex-1 h-12 font-black uppercase italic shadow-xl"
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoicePreviewDialog({ url, storageKey, trackingNumber, alert, onProcess }: { url: string | null, storageKey: string, trackingNumber: string, alert: any, onProcess: (a: any, w: number, c: number) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<GenerateCustomsFormOutput | null>(null);
    const { toast } = useToast();

    const handleRunAi = async () => {
        if (!storageKey) return;
        setIsAnalyzing(true);
        try {
            const result = await generateCustomsForm({ trackingNumber: alert.tracking_number, contentsDescription: alert.contents || 'Not specified', weight: `${alert.weight_lbs || '0'} lbs`, invoiceDataUri: storageKey });
            setAiResult(result);
            toast({ title: "Analysis Complete" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-10 font-black uppercase italic text-[10px] border-2 shadow-sm px-6"><Eye className="mr-2 h-4 w-4" /> Review Record</Button></DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-3xl border-4">
                <DialogHeader className="p-8 pb-4 bg-muted/10 border-b">
                    <div className="flex items-center justify-between w-full">
                        <div><DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">Viewing Terminal</DialogTitle><DialogDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Universal Logistics ID: {trackingNumber}</DialogDescription></div>
                        {storageKey && <Button onClick={handleRunAi} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase italic text-[10px] h-8 px-6 shadow-lg">{isAnalyzing ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <BrainCircuit className="h-3.5 w-3.5 mr-2" />} Run AI Smart Analysis</Button>}
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 bg-zinc-100 dark:bg-zinc-900 p-8 flex items-center justify-center relative min-h-[500px]">
                        {url ? <iframe src={url} className="w-full h-full border-none rounded-xl bg-white shadow-2xl" /> : <div className="text-center opacity-30 italic">No document available for review.</div>}
                    </div>
                    <div className="lg:col-span-5 bg-background p-8 border-l-4 flex flex-col gap-8 shadow-inner overflow-y-auto">
                        {aiResult && (
                            <div className="p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 space-y-4">
                                <h4 className="text-xs font-black uppercase text-indigo-700 flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> AI Analysis Results</h4>
                                <div className="space-y-4">
                                    <div><p className="text-[10px] font-black uppercase opacity-60 text-indigo-600">Sender Info</p><p className="text-xs font-bold">{aiResult.customsForm.sender}</p></div>
                                    <div><p className="text-[10px] font-black uppercase opacity-60 text-indigo-600">Recipient Info</p><p className="text-xs font-bold">{aiResult.customsForm.recipient}</p></div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-6">
                            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2"><p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Customer Identity</p><p className="font-black uppercase text-lg tracking-tighter italic">{alert.profiles?.full_name}</p></div>
                            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2"><p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Contents Declaration</p><p className="font-bold uppercase text-xs italic opacity-80 leading-relaxed">"{alert.contents || 'No declaration'}"</p></div>
                        </div>
                        <div className="flex-1 flex flex-col justify-end gap-4">
                            <Alert className="bg-orange-50 border-orange-200 rounded-2xl border-2"><AlertCircle className="h-4 w-4 text-orange-600" /><AlertDescription className="text-[10px] font-black text-orange-800 uppercase leading-relaxed italic">VIEWING ONLY: NO LEDGER MUTATIONS AUTHORIZED ON THIS SCREEN.</AlertDescription></Alert>
                            {alert.status === 'Pending' && (
                                <div className="space-y-3">
                                    <IntakeDialog alert={alert} onProcess={onProcess} triggerLabel="Move to Active Shipping (Authorize Intake)" className="w-full h-16 text-lg rounded-2xl shadow-xl bg-primary" onIntakeSuccess={() => setOpen(false)} />
                                    <p className="text-[9px] text-center font-bold uppercase opacity-40 tracking-tighter">This action will convert viewing record into a billable shipment.</p>
                                </div>
                            )}
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
        if (!isNaN(w) && w > 0) setCost(calculateShippingCost(w).toString());
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
            <DialogTrigger asChild><Button variant="secondary" size="sm" className={cn("font-black uppercase italic text-[10px] border-2", !className && "h-10 px-8", className)}>{triggerLabel === "Create Shipment" ? triggerLabel : <><Zap className="mr-2 h-4 w-4" /> {triggerLabel}</>}</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl border-4">
                <DialogHeader><DialogTitle className="uppercase italic tracking-tighter text-3xl text-center font-black">Finalize Global Intake</DialogTitle></DialogHeader>
                <div className="space-y-8 py-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] ml-1">Verified Weight (LBS)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-16 text-3xl font-black border-4 rounded-2xl" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] ml-1">Calculated Cost (JMD $)</Label><Input type="number" value={cost} readOnly className="h-16 text-3xl font-black border-4 rounded-2xl bg-muted/30 border-dashed" /></div>
                    </div>
                </div>
                <DialogFooter className="gap-3"><DialogClose asChild><Button variant="outline" className="h-14 font-black uppercase w-full border-2 rounded-xl">Abort</Button></DialogClose><Button onClick={handleConfirm} disabled={isProcessing || !cost} className="flex-1 h-14 font-black uppercase italic shadow-2xl rounded-xl">{isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Confirm & Bill</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
