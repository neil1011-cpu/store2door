'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader2, Search, Zap, RefreshCw, Eye, Package, PlusCircle, CheckCircle2, AlertCircle, Weight, DollarSign, ListRestart, CalendarDays, Trash2, FileText } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateShippingCost } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SHIPMENT_STATUSES = [
  'Received at Warehouse (FL)',
  'Processed',
  'Being Shipped',
  'In Transit',
  'Arrived in Jamaica',
  'Customs',
  'On Route',
  'Available for pickup',
  'Delivered'
];

export default function ShippingPage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shipRes, usersRes] = await Promise.all([
        supabase.from('shipments').select('*, profiles(full_name, mailbox_number)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('full_name', { ascending: true })
      ]);
      setShipments(shipRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error: any) {
      toast({ title: "Fetch Failure", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('shipment-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
            fetchData();
        })
        .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleSyncLogicware = async () => {
    setIsSyncing(true);
    try {
        const response = await fetch('/api/admin/logicware-shipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Sync failed');

        const external = data.shipments || [];
        let importedCount = 0;

        for (const s of external) {
            const tracking = s.trackingNumber || s.code;
            const mailbox = s.shipper?.referenceCode || s.referenceCode;

            if (!tracking || !mailbox) continue;

            // Check if we have this tracking
            const exists = shipments.find(ls => ls.tracking_number === tracking);
            if (exists) continue;

            // Look up user
            const profile = users.find(u => u.mailbox_number === mailbox);
            if (!profile) continue;

            // Import
            await supabase.from('shipments').insert({
                profile_id: profile.id,
                tracking_number: tracking,
                contents: s.contents || 'Hub Sync',
                weight_lbs: parseFloat(s.weight) || 0,
                status: s.status?.name || s.status || 'Processed',
                total_cost_jmd: 0,
                payment_status: 'Unpaid'
            });
            importedCount++;
        }

        toast({ title: "Hub Sync Complete", description: `Imported ${importedCount} new worldwide records.` });
        fetchData();
    } catch (err: any) {
        toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return shipments;
    const s = searchTerm.toLowerCase();
    return shipments.filter(ship => 
        ship.tracking_number.toLowerCase().includes(s) || 
        ship.profiles?.full_name?.toLowerCase().includes(s)
    );
  }, [shipments, searchTerm]);

  const handleManualEntry = async (data: any) => {
    setIsSubmitting(true);
    try {
        const { profileId, trackingNumber, contents, weight, cost } = data;

        // 1. Create Shipment
        const { data: shipment, error: shipError } = await supabase.from('shipments').insert({
            profile_id: profileId,
            tracking_number: trackingNumber.toUpperCase(),
            contents,
            weight_lbs: parseFloat(weight),
            total_cost_jmd: parseFloat(cost),
            status: 'Processed',
            payment_status: 'Unpaid'
        }).select().single();

        if (shipError) throw shipError;

        // 2. Generate Invoice
        await supabase.from('invoices').insert({
            profile_id: profileId,
            amount: parseFloat(cost),
            status: 'Unpaid',
            invoice_number: `INV-${trackingNumber.slice(-4)}-${Date.now().toString().slice(-4)}`
        });

        // 3. Record in Financial Ledger
        await supabase.from('financial_ledger').insert({
            profile_id: profileId,
            amount: -parseFloat(cost),
            transaction_type: 'shipping_fee',
            description: `Manual Shipment Entry: ${trackingNumber} (${weight} lbs)`
        });

        toast({ title: "Shipment Recorded" });
        setIsAddOpen(false);
        fetchData();
    } catch (error: any) {
        toast({ title: "Entry Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, trackingNumber: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', shipmentId);

      if (error) throw error;
      toast({ title: "Status Updated" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDeleteShipment = async (shipmentId: string, trackingNumber: string) => {
    setIsDeleting(shipmentId);
    try {
      const { error } = await supabase.from('shipments').delete().eq('id', shipmentId);
      if (error) throw error;
      toast({ title: "Record Purged" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Deletion Failed", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Shipping Ledger</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px]">Real-time Supabase Logistics Gateway</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleSyncLogicware} disabled={isSyncing} variant="outline" className="font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync External Hub
            </Button>
            <Button variant="outline" onClick={fetchData} className="font-bold border-2">
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button className="font-black uppercase italic shadow-lg">
                        <PlusCircle className="mr-2 h-4 w-4" /> Manual Entry
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">New Shipment Entry</DialogTitle>
                    </DialogHeader>
                    <ManualShipmentForm users={users} onSubmit={handleManualEntry} isSubmitting={isSubmitting} />
                </DialogContent>
            </Dialog>

            <Button variant="outline" asChild className="font-bold border-2">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Global Registry</CardTitle>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tracking or name..." className="pl-9 h-10 border-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
                <TableRow>
                    <TableHead className="pl-6 text-[10px] font-black uppercase">Tracking ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Weight</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Invoice</TableHead>
                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Cost (JMD)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></TableCell></TableRow>
                ) : filtered.map(s => (
                    <TableRow key={s.id} className="h-20 hover:bg-primary/5 transition-colors">
                        <TableCell className="pl-6">
                            <p className="font-mono font-black text-primary uppercase text-sm">{s.tracking_number}</p>
                            <p className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[150px]">{s.contents || 'No Description'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-60">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-xs uppercase italic">{s.profiles?.full_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-black italic">
                            <Weight className="h-3 w-3 opacity-40" />
                            {s.weight_lbs} LBS
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase italic border-2">{s.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            {s.invoice_url ? (
                                <Button variant="ghost" size="sm" asChild className="h-8 text-primary font-bold uppercase text-[10px]">
                                    <Link href={`/api/storage/view?key=${encodeURIComponent(s.invoice_url)}`} target="_blank">
                                        <FileText className="h-3.5 w-3.5 mr-1" /> Doc
                                    </Link>
                                </Button>
                            ) : (
                                <span className="text-[9px] opacity-20 italic">No File</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-black tracking-tighter text-lg text-primary">
                            JMD ${Number(s.total_cost_jmd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <StatusUpdateDialog 
                              shipment={s} 
                              onUpdate={(newStatus) => handleStatusUpdate(s.id, s.tracking_number, newStatus)} 
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-destructive/5 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-black uppercase italic">Purge Shipment Record?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-[10px] font-bold uppercase">
                                    This will permanently remove <strong>{s.tracking_number}</strong> from the global registry.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-bold h-12 uppercase">Abort</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteShipment(s.id, s.tracking_number)}
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
                ))}
                {filtered.length === 0 && !isLoading && <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 italic">No shipments detected.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusUpdateDialog({ shipment, onUpdate }: { shipment: any, onUpdate: (status: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(shipment.status);
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
          <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Package Transit State</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase opacity-60">New Status Stage</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-14 text-lg font-black border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPMENT_STATUSES.map(st => (
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
            disabled={isUpdating || status === shipment.status} 
            className="flex-1 h-12 font-black uppercase italic shadow-xl"
          >
            {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
            Update State
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualShipmentForm({ users, onSubmit, isSubmitting }: { users: any[], onSubmit: (data: any) => void, isSubmitting: boolean }) {
    const [formData, setFormData] = useState({ profileId: '', trackingNumber: '', contents: '', weight: '', cost: '' });
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        const w = parseFloat(formData.weight);
        if (!isNaN(w) && w > 0) {
            setIsCalculating(true);
            const calculated = calculateShippingCost(w);
            setFormData(prev => ({ ...prev, cost: calculated.toString() }));
            setIsCalculating(false);
        }
    }, [formData.weight]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.profileId || !formData.trackingNumber || !formData.weight || !formData.cost) return;
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-60">Customer Identity</Label>
                <Select value={formData.profileId} onValueChange={v => setFormData({ ...formData, profileId: v })}>
                    <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id} className="font-bold uppercase text-xs">{u.full_name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Tracking #</Label>
                    <Input value={formData.trackingNumber} onChange={e => setFormData({ ...formData, trackingNumber: e.target.value.toUpperCase() })} className="h-11 border-2 font-mono uppercase" placeholder="JM..." required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label>
                    <Input value={formData.contents} onChange={e => setFormData({ ...formData, contents: e.target.value })} className="h-11 border-2" placeholder="e.g. Shoes" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label>
                    <div className="relative">
                        <Input type="number" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className="h-14 text-2xl font-black border-2 pl-4" placeholder="0" required />
                        <Weight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Cost (JMD $)</Label>
                    <div className="relative">
                        <Input type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="h-14 text-2xl font-black border-2 pl-4" placeholder="0.00" required />
                        <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20" />
                    </div>
                </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                    Creation will instantly issue an invoice and debit the client registry.
                </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
                <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting || !formData.cost} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <Zap className="mr-2 h-4 w-4" />} Authorize Shipment
                </Button>
            </DialogFooter>
        </form>
    );
}
