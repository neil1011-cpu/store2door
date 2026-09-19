'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, ArrowLeft, Loader2, FileText, Zap, RefreshCw, CheckCircle2, DollarSign, Clock, Trash2, Eye, Download, AlertCircle, ArrowRight, History, ImageIcon, BrainCircuit, Copy, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useSupabase } from '@/components/supabase-provider';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateCustomsForm, type GenerateCustomsFormOutput } from '@/ai/flows/generate-customs-form';

export default function PreAlertsPage() {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [preAlerts, setPreAlerts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    
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

    const handleDeletePreAlert = async (id: string, trackingNumber: string) => {
        setIsDeleting(id);
        try {
            const { error } = await supabase.from('pre_alerts').delete().eq('id', id);
            if (error) throw error;

            toast({ title: "Document Purged" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };

    const handleProcessIntake = async (alert: any, verifiedWeight: number, calculatedCost: number) => {
        try {
            // 1. Create Shipment (Copying invoice_url metadata)
            const { data: shipment, error: shipError } = await supabase.from('shipments').insert({
                profile_id: alert.profile_id,
                tracking_number: alert.tracking_number,
                contents: alert.contents,
                weight_lbs: verifiedWeight,
                total_cost_jmd: calculatedCost,
                status: 'Processed',
                payment_status: 'Unpaid',
                invoice_url: alert.invoice_url // CRITICAL: Persist document reference
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

            toast({ title: "Intake Secured" });
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
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id} className="font-bold uppercase text-xs">
                                                    {u.full_name} ({u.mailbox_number})
                                                </SelectItem>
                                            ))}
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
                                <TableHead className="pl-6 text-[10px] font-black uppercase">Document</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Tracking ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Retention</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {preAlerts.map(alert => {
                                const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(alert.submission_date).getTime()) / (1000 * 60 * 60 * 24)));
                                const proxyUrl = alert.invoice_url ? `/api/storage/view?key=${encodeURIComponent(alert.invoice_url)}` : null;
                                
                                return (
                                    <TableRow key={alert.id} className={cn("hover:bg-primary/5 transition-colors h-24", alert.status === 'Processed' && "opacity-60")}>
                                        <TableCell className="pl-6">
                                            {proxyUrl ? (
                                                <div className="relative h-16 w-16 rounded-lg overflow-hidden border-2 border-muted bg-muted/20 flex items-center justify-center">
                                                    {alert.invoice_url.toLowerCase().endsWith('.pdf') ? (
                                                        <FileText className="h-8 w-8 text-primary opacity-40" />
                                                    ) : (
                                                        <img 
                                                            src={proxyUrl} 
                                                            alt="Thumbnail" 
                                                            className="object-cover w-full h-full" 
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/%3E%3Cpolyline points="14 2 14 8 20 8"/%3E%3C/svg%3E';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-16 w-16 rounded-lg bg-muted/10 border-2 border-dashed flex items-center justify-center text-muted-foreground/30">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={alert.status === 'Processed' ? 'secondary' : 'default'} className="uppercase text-[8px] font-black italic border-2">
                                                {alert.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm uppercase">{alert.profiles?.full_name || 'Legacy Account'}</span>
                                                <span className="text-[9px] font-bold opacity-60 uppercase truncate max-w-[150px]">{alert.contents || 'No Description'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-black text-primary uppercase text-sm tracking-tighter">{alert.tracking_number}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className={cn("h-3 w-3", daysLeft < 5 ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                                                <span className={cn("text-[10px] font-bold uppercase", daysLeft < 5 && "text-red-600")}>{daysLeft} Days Left</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {proxyUrl ? (
                                                    <InvoicePreviewDialog url={proxyUrl} storageKey={alert.invoice_url} trackingNumber={alert.tracking_number} alert={alert} onProcess={handleProcessIntake} />
                                                ) : (
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <Badge variant="outline" className="opacity-30 uppercase text-[8px] h-7 px-4 flex items-center">No Document</Badge>
                                                        {alert.status === 'Pending' && (
                                                            <IntakeDialog alert={alert} onProcess={handleProcessIntake} />
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="hover:bg-destructive/5 text-muted-foreground hover:text-destructive h-10 w-10">
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle className="font-black uppercase italic">Purge Pre-Alert Record?</AlertDialogTitle>
                                                      <AlertDialogDescription className="text-[10px] font-bold uppercase">
                                                        This will permanently remove <strong>{alert.tracking_number}</strong> from the hub.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel className="font-bold h-12 uppercase">Abort</AlertDialogCancel>
                                                      <AlertDialogAction 
                                                        onClick={() => handleDeletePreAlert(alert.id, alert.tracking_number)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase h-12 shadow-lg"
                                                      >
                                                        Authorize Purge
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function InvoicePreviewDialog({ url, storageKey, trackingNumber, alert, onProcess }: { url: string, storageKey: string, trackingNumber: string, alert: any, onProcess: (a: any, w: number, c: number) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [aiResult, setAiResult] = useState<GenerateCustomsFormOutput | null>(null);
    const { toast } = useToast();

    const isPdf = storageKey.toLowerCase().endsWith('.pdf');

    const handleRunAi = async () => {
        setIsAnalyzing(true);
        try {
            const result = await generateCustomsForm({
                trackingNumber: alert.tracking_number,
                contentsDescription: alert.contents || 'Not specified',
                weight: `${alert.weight_lbs || '0'} lbs`,
                invoiceDataUri: storageKey // Pass the KEY, the flow is updated to handle S3 keys
            });
            setAiResult(result);
            toast({ title: "Analysis Complete", description: "AI has extracted document details." });
        } catch (error: any) {
            toast({ title: "AI Error", description: error.message, variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Text copied to clipboard." });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setLoadError(false); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 font-black uppercase italic text-[10px] border-2 shadow-sm px-6">
                    <Eye className="mr-2 h-4 w-4" /> Review Document
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-3xl border-4">
                <DialogHeader className="p-8 pb-4 bg-muted/10 border-b">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">Documentation Terminal</DialogTitle>
                            <DialogDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Universal Logistics ID: {trackingNumber}</DialogDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button onClick={handleRunAi} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase italic text-[10px] h-8 px-6 shadow-lg">
                                {isAnalyzing ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <BrainCircuit className="h-3.5 w-3.5 mr-2" />}
                                {isAnalyzing ? "Analyzing..." : "Run AI Smart Analysis"}
                            </Button>
                            <Badge className="bg-primary text-[10px] font-black uppercase italic h-8 px-6 border-2 border-white/20">Security Verification Active</Badge>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 bg-zinc-100 dark:bg-zinc-900 p-8 flex items-center justify-center relative min-h-[500px]">
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white group">
                            {isPdf ? (
                                <embed src={url} type="application/pdf" className="w-full h-full rounded-xl" />
                            ) : (
                                <div className="relative w-full h-full">
                                    {loadError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 p-6 text-center space-y-4">
                                            <AlertCircle className="h-12 w-12 text-destructive" />
                                            <div className="space-y-1">
                                                <p className="font-black uppercase tracking-tight">Display Interrupted</p>
                                                <p className="text-xs font-medium text-muted-foreground">The browser blocked direct rendering of this asset.</p>
                                            </div>
                                            <Button variant="secondary" className="font-black uppercase text-[10px]" asChild>
                                                <Link href={url} target="_blank"><ExternalLink className="mr-2 h-3 w-3" /> Open in Secure Tab</Link>
                                            </Button>
                                        </div>
                                    )}
                                    <img 
                                        src={url} 
                                        alt="Commercial Invoice" 
                                        className={cn("object-contain w-full h-full transition-opacity duration-300", loadError ? "opacity-0" : "opacity-100")}
                                        referrerPolicy="no-referrer"
                                        onError={() => setLoadError(true)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-5 bg-background p-8 border-l-4 flex flex-col gap-8 shadow-inner overflow-y-auto">
                        {aiResult ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 space-y-4">
                                    <h4 className="text-xs font-black uppercase text-indigo-700 flex items-center gap-2">
                                        <BrainCircuit className="h-4 w-4" /> AI Analysis Results
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase opacity-60 text-indigo-600">Sender Info</p>
                                            <div className="flex items-start justify-between gap-2 mt-1">
                                                <p className="text-xs font-bold leading-relaxed">{aiResult.customsForm.sender}</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-400" onClick={() => copyToClipboard(aiResult.customsForm.sender)}>
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase opacity-60 text-indigo-600">Recipient Info</p>
                                            <div className="flex items-start justify-between gap-2 mt-1">
                                                <p className="text-xs font-bold leading-relaxed">{aiResult.customsForm.recipient}</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-400" onClick={() => copyToClipboard(aiResult.customsForm.recipient)}>
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-6">
                            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Customer Identity</p>
                                <p className="font-black uppercase text-lg tracking-tighter italic">{alert.profiles?.full_name}</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Contents Declaration</p>
                                <p className="font-bold uppercase text-xs italic opacity-80 leading-relaxed">"{alert.contents || 'No declaration provided'}"</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-muted/30 border-2 space-y-1">
                                <p className="text-[10px] font-black uppercase opacity-40">Declared Weight</p>
                                <p className="font-mono font-black text-xl">{alert.weight_lbs || '0.00'} LBS</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-end gap-4">
                            <Alert className="bg-orange-50 border-orange-200 rounded-2xl border-2">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-[10px] font-black text-orange-800 uppercase leading-relaxed italic">
                                    VERIFICATION REQUIRED: ENSURE DOCUMENT MATCHES REGISTRY DATA BEFORE SHIPMENT CREATION.
                                </AlertDescription>
                            </Alert>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <Button variant="outline" className="font-black uppercase h-14 border-2 shadow-sm rounded-xl text-xs tracking-widest" asChild>
                                    <Link href={url} target="_blank" download><Download className="mr-2 h-4 w-4" /> Download Original</Link>
                                </Button>
                                {alert.status === 'Pending' ? (
                                    <div className="space-y-3">
                                        <IntakeDialog 
                                            alert={alert} 
                                            onProcess={onProcess} 
                                            triggerLabel="Authorize Intake & Create Shipment" 
                                            className="w-full h-16 text-lg rounded-2xl shadow-xl bg-primary hover:bg-primary/90" 
                                            onIntakeSuccess={() => setOpen(false)} 
                                        />
                                        <p className="text-[9px] text-center font-bold uppercase opacity-40 tracking-tighter">Creation will generate invoice and debit client ledger.</p>
                                    </div>
                                ) : (
                                    <Button disabled className="h-16 font-black uppercase opacity-40 rounded-2xl border-4"><CheckCircle2 className="mr-2 h-6 w-6 text-green-500" /> Registry Item Processed</Button>
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
                <Button variant="secondary" size="sm" className={cn("font-black uppercase italic text-[10px] border-2", !className && "h-10 px-8", className)}>
                    {triggerLabel === "Create Shipment" ? triggerLabel : <><Zap className="mr-2 h-4 w-4" /> {triggerLabel}</>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl border-4">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-3xl text-center font-black">Authorize Global Intake</DialogTitle>
                </DialogHeader>
                <div className="space-y-8 py-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] ml-1">Verified Weight (LBS)</Label>
                            <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-16 text-3xl font-black border-4 rounded-2xl focus-visible:ring-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] ml-1">Calculated Cost (JMD $)</Label>
                            <Input type="number" value={cost} readOnly className="h-16 text-3xl font-black border-4 rounded-2xl bg-muted/30 border-dashed" />
                        </div>
                    </div>
                    <Alert className="bg-primary/5 border-primary/20 border-2 rounded-2xl shadow-inner">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <AlertDescription className="text-[11px] font-black uppercase italic text-primary leading-tight">
                            AUTHENTICATION WARNING: THIS ACTION WILL GENERATE AN INVOICE AND DEBIT THE CLIENT REGISTRY INSTANTLY.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter className="gap-3">
                    <DialogClose asChild><Button variant="outline" className="h-14 font-black uppercase w-full border-2 rounded-xl">Abort</Button></DialogClose>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isProcessing || !cost} 
                        className="flex-1 h-14 font-black uppercase italic shadow-2xl rounded-xl"
                    >
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} 
                        Confirm & Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
