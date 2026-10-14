'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, Zap, RefreshCw, Package, PlusCircle, CheckCircle2, ListChecks, FileSpreadsheet, Trash2, ListRestart } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

const SHIPMENT_STATUSES = [
  'Received',
  'Processing',
  'In transit',
  'Out for delivery',
  'Ready for pick up',
  'Delivered',
  'Returned',
  'On Hold'
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

  // Bulk State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [shipRes, usersRes] = await Promise.all([
        supabase.from('shipments').select('*, profiles(full_name, mailbox_number)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('full_name', { ascending: true })
      ]);
      if (shipRes.error) throw shipRes.error;
      if (usersRes.error) throw usersRes.error;

      setShipments(shipRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error: any) {
      toast({ title: "Fetch Failure", description: error.message, variant: "destructive" });
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('shipment-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
            fetchData(true);
        })
        .subscribe();
    
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [supabase, fetchData]);

  const filtered = useMemo(() => {
    if (!searchTerm) return shipments;
    const s = searchTerm.toLowerCase();
    return shipments.filter(ship => 
        ship.tracking_number.toLowerCase().includes(s) || 
        ship.profiles?.full_name?.toLowerCase().includes(s) ||
        ship.profiles?.mailbox_number?.toLowerCase().includes(s)
    );
  }, [shipments, searchTerm]);

  const toggleSelectAll = () => {
      if (selectedIds.size === filtered.length && filtered.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filtered.map(s => s.id)));
      }
  };

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    setIsBulkProcessing(true);
    try {
        const ids = Array.from(selectedIds);
        const { error } = await supabase.from('shipments').update({ status: newStatus }).in('id', ids);
        if (error) throw error;

        // Sync each to Logicware Hub
        for (const id of ids) {
            fetch('/api/admin/logicware-push-shipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentId: id })
            }).catch(e => console.warn('[BULK_SYNC_WARN]', e));
        }

        toast({ title: "Bulk Status Updated", description: `${ids.length} records transitioned to ${newStatus}.` });
        setSelectedIds(new Set());
        setIsBulkStatusOpen(false);
        fetchData(true);
    } catch (err: any) {
        toast({ title: "Bulk Update Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsBulkProcessing(false);
    }
  };

  const handleCreateManifestFromSelected = async (data: any) => {
      setIsBulkProcessing(true);
      try {
          const ids = Array.from(selectedIds);
          
          // 1. Create Manifest record in registry
          const { data: manifest, error: mError } = await supabase.from('manifests').insert({
              flight_number: data.flightNumber,
              manifest_date: data.date,
              carrier: data.carrier,
              origin: data.origin,
              destination: data.destination,
              status: 'Scheduled',
              manifest_type: data.type
          }).select().single();

          if (mError) throw mError;

          // 2. Assign shipments to this manifest
          const { error: sError } = await supabase.from('shipments').update({
              manifest_id: manifest.id
          }).in('id', ids);

          if (sError) throw sError;

          toast({ 
              title: "Manifest Generated", 
              description: `Route ${data.flightNumber} established with ${ids.length} parcels.` 
          });
          
          setSelectedIds(new Set());
          setIsManifestOpen(false);
          fetchData(true);
      } catch (err: any) {
          toast({ title: "Manifest Error", description: err.message, variant: "destructive" });
      } finally {
          setIsBulkProcessing(false);
      }
  };

  const handleSyncLogicware = async () => {
    setIsSyncing(true);
    try {
        const response = await fetch('/api/admin/logicware-shipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Hub communication failed');
        toast({ title: "Hub Sync Complete", description: "Shipment registry updated from external hub." });
        fetchData();
    } catch (err: any) {
        toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleManualEntry = async (data: any) => {
    setIsSubmitting(true);
    try {
        const { profileId, trackingNumber, contents, weight, cost } = data;
        const { data: shipment, error: shipError } = await supabase.from('shipments').insert({
            profile_id: profileId,
            tracking_number: trackingNumber.toUpperCase(),
            contents,
            weight_lbs: parseFloat(weight),
            total_cost_jmd: parseFloat(cost),
            status: 'Processing',
            payment_status: 'Unpaid'
        }).select().single();

        if (shipError) throw shipError;

        await supabase.from('invoices').insert({
            profile_id: profileId,
            amount: parseFloat(cost),
            status: 'Unpaid',
            invoice_number: `INV-${trackingNumber.slice(-4)}-${Date.now().toString().slice(-4)}`
        });

        await supabase.from('financial_ledger').insert({
            profile_id: profileId,
            amount: -parseFloat(cost),
            transaction_type: 'shipping_fee',
            description: `Manual Shipment Entry: ${trackingNumber}`
        });

        fetch('/api/admin/logicware-push-shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId: shipment.id })
        }).catch(e => console.warn('[LOGICWARE_PUSH_FAIL]', e));

        toast({ title: "Shipment Recorded" });
        setIsAddOpen(false);
        fetchData();
    } catch (error: any) {
        toast({ title: "Entry Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('shipments').update({ status: newStatus }).eq('id', shipmentId);
      if (error) throw error;
      
      fetch('/api/admin/logicware-push-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId })
      }).catch(err => console.warn('[LOGICWARE_SYNC_WARN]', err));

      toast({ title: "Status Updated" });
      fetchData(true);
    } catch (error: any) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    setIsDeleting(shipmentId);
    try {
      const { error } = await supabase.from('shipments').delete().eq('id', shipmentId);
      if (error) throw error;
      toast({ title: "Record Purged" });
      fetchData(true);
    } catch (error: any) {
      toast({ title: "Deletion Failed", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Shipping Ledger</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px]">Active Transits Only (Hub Synced)</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2 bg-primary/5 p-1 rounded-lg border-2 border-primary/20">
                    <Badge className="font-black italic ml-2">{selectedIds.size} SELECTED</Badge>
                    <Dialog open={isBulkStatusOpen} onOpenChange={setIsBulkStatusOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" className="font-black uppercase italic text-[10px]">
                                <ListChecks className="mr-2 h-3.5 w-3.5" /> Bulk Status
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="uppercase italic text-center font-black">Transition {selectedIds.size} Parcels</DialogTitle>
                            </DialogHeader>
                            <div className="py-6 space-y-4">
                                <Label className="text-[10px] font-bold uppercase opacity-60">New Target Status</Label>
                                <Select onValueChange={handleBulkStatusUpdate}>
                                    <SelectTrigger className="h-14 text-lg font-black border-2"><SelectValue placeholder="Select new state" /></SelectTrigger>
                                    <SelectContent>
                                        {SHIPMENT_STATUSES.map(st => <SelectItem key={st} value={st} className="font-bold uppercase text-xs">{st}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter><DialogClose asChild><Button variant="outline" className="w-full">Cancel</Button></DialogClose></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isManifestOpen} onOpenChange={setIsManifestOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="font-black uppercase italic text-[10px]">
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Build Manifest
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="uppercase italic text-center font-black">New Route Manifest</DialogTitle>
                            </DialogHeader>
                            <ManifestBuilderForm onSubmit={handleCreateManifestFromSelected} isSubmitting={isBulkProcessing} count={selectedIds.size} />
                        </DialogContent>
                    </Dialog>
                </div>
            )}
            <Button onClick={handleSyncLogicware} disabled={isSyncing} variant="outline" className="font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync Hub
            </Button>
            <Button variant="outline" onClick={() => fetchData()} className="font-bold border-2">
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

      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tracking #, name, or mailbox..." 
            className="pl-10 h-12 border-2 shadow-sm rounded-xl max-w-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Active Logistics Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
                <TableRow>
                    <TableHead className="w-[50px] pl-6">
                        <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Tracking ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Cost (JMD)</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && filtered.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-20">
                            <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" />
                        </TableCell>
                    </TableRow>
                ) : (
                    filtered.map(s => (
                        <TableRow key={s.id} className={cn("h-20 hover:bg-primary/5 transition-colors", selectedIds.has(s.id) && "bg-primary/10")}>
                            <TableCell className="pl-6">
                                <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                            </TableCell>
                            <TableCell>
                                <p className="font-mono font-black text-primary uppercase text-sm">{s.tracking_number}</p>
                                <p className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[150px]">{s.contents || 'No Description'}</p>
                            </TableCell>
                            <TableCell>
                                <p className="font-bold text-xs uppercase italic">{s.profiles?.full_name}</p>
                                <p className="text-[9px] font-mono opacity-60 uppercase">{s.profiles?.mailbox_number}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase italic border-2">{s.status}</Badge></TableCell>
                            <TableCell className="text-right pr-6 font-black tracking-tighter text-lg text-primary">
                                JMD ${Number(s.total_cost_jmd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                                <StatusUpdateDialog 
                                shipment={s} 
                                onUpdate={(newStatus) => handleStatusUpdate(s.id, newStatus)} 
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
                                        This will permanently remove <strong>{s.tracking_number}</strong> from the active ledger.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel className="font-black uppercase h-12 border-2">Abort</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleDeleteShipment(s.id)}
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
                    ))
                )}
                {filtered.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center text-muted-foreground italic opacity-30">
                            No active shipments match your search.
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
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
            Update State
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualShipmentForm({ users, onSubmit, isSubmitting }: { users: any[], onSubmit: (data: any) => void, isSubmitting: boolean }) {
    const [formData, setFormData] = useState({ profileId: '', trackingNumber: '', contents: '', weight: '', cost: '' });

    useEffect(() => {
        const w = parseFloat(formData.weight);
        if (!isNaN(w) && w > 0) {
            setFormData(prev => ({ ...prev, cost: calculateShippingCost(w).toString() }));
        }
    }, [formData.weight]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.profileId || !formData.trackingNumber || !formData.weight) return;
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
                    <Input type="number" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className="h-14 text-2xl font-black border-2" placeholder="0" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Cost (JMD $)</Label>
                    <Input type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="h-14 text-2xl font-black border-2" placeholder="0.00" required />
                </div>
            </div>

            <DialogFooter className="gap-2">
                <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting || !formData.cost} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} Authorize Shipment
                </Button>
            </DialogFooter>
        </form>
    );
}

function ManifestBuilderForm({ onSubmit, isSubmitting, count }: { onSubmit: (data: any) => void, isSubmitting: boolean, count: number }) {
    const [formData, setFormData] = useState({ flightNumber: '', date: new Date().toISOString().split('T')[0], carrier: '', origin: 'Florida', destination: 'Jamaica', type: 'Air' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.flightNumber) return;
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <Alert className="bg-primary/5 border-dashed border-2">
                <Package className="h-4 w-4" />
                <AlertDescription className="text-[10px] font-black uppercase italic">Creating manifest for {count} selected shipments.</AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Flight/Voyage #</Label>
                    <Input value={formData.flightNumber} onChange={e => setFormData({...formData, flightNumber: e.target.value.toUpperCase()})} className="h-11 border-2 font-mono" placeholder="JM..." required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Route Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-11 border-2" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Carrier / Airline</Label>
                    <Input value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})} className="h-11 border-2" placeholder="e.g. JetBlue" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Transit Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                        <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Air">Air Freight</SelectItem>
                            <SelectItem value="Sea">Sea Freight</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <DialogFooter className="gap-2">
                <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting || !formData.flightNumber} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Create Manifest
                </Button>
            </DialogFooter>
        </form>
    );
}