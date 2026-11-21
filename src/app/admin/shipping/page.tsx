'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, Zap, RefreshCw, Package, PlusCircle, CheckCircle2, ListChecks, FileSpreadsheet, Trash2, History, RefreshCcw, User, Calculator, Gavel, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateShippingCost, calculateCustomsDuty, CUSTOMS_RATES, type CustomsCategory } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { triggerStatusNotification } from '@/lib/notifications';

const SHIPMENT_STATUSES = [
  'Received in Florida Warehouse',
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
  const [syncingShipmentId, setSyncingShipmentId] = useState<string | null>(null);
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
        supabase.from('shipments').select('*, profiles:profile_id(full_name, email, mailbox_number)').order('created_at', { ascending: false }),
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
        const selectedShipments = shipments.filter(s => ids.includes(s.id));
        
        const { error } = await supabase.from('shipments').update({ status: newStatus }).in('id', ids);
        if (error) throw error;

        for (const ship of selectedShipments) {
            // Push to Logicware
            fetch('/api/admin/logicware-push-shipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentId: ship.id })
            }).catch(e => console.warn('[BULK_SYNC_WARN]', e));

            // Trigger Email Notification
            if (ship.profiles?.email) {
                const freight = Number(ship.total_cost_jmd) || calculateShippingCost(Number(ship.weight_lbs) || 0);
                const duty = Number(ship.duty_jmd) || 0;
                triggerStatusNotification({
                    recipientEmail: ship.profiles.email,
                    recipientName: ship.profiles.full_name,
                    trackingNumber: ship.tracking_number,
                    status: newStatus,
                    oldStatus: ship.status,
                    totalCost: freight + duty
                }).catch(e => console.error("[BULK_NOTIFY_ERROR]", e));
            }
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
        toast({ title: "Hub Sync Complete" });
        fetchData();
    } catch (err: any) {
        toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleSyncShipment = async (shipmentId: string) => {
    setSyncingShipmentId(shipmentId);
    try {
        const response = await fetch('/api/admin/logicware-push-shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Push failed');

        toast({ 
            title: "Hub Synchronized", 
            description: `Shipment record ${data.operation === 'create' ? 'created' : 'updated'} in Hub.${data.statusPush ? ' ' + data.statusPush : ''}` 
        });
        fetchData(true); 
    } catch (err: any) {
        toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    } finally {
        setSyncingShipmentId(null);
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
            invoice_number: `INV-${trackingNumber.slice(-4)}-${Date.now().toString().slice(-4)}`,
            tracking_number: trackingNumber.toUpperCase()
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
      const currentShipment = shipments.find(s => s.id === shipmentId);
      
      const { error } = await supabase.from('shipments').update({ status: newStatus }).eq('id', shipmentId);
      if (error) throw error;
      
      // Push to Logicware
      fetch('/api/admin/logicware-push-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId })
      }).catch(err => console.warn('[LOGICWARE_SYNC_WARN]', err));

      // Trigger Email Notification
      if (currentShipment?.profiles?.email) {
          const freight = Number(currentShipment.total_cost_jmd) || calculateShippingCost(currentShipment.weight_lbs);
          const duty = Number(currentShipment.duty_jmd) || 0;
          triggerStatusNotification({
              recipientEmail: currentShipment.profiles.email,
              recipientName: currentShipment.profiles.full_name,
              trackingNumber: currentShipment.tracking_number,
              status: newStatus,
              oldStatus: currentShipment.status,
              totalCost: freight + duty
          }).catch(e => console.error("[NOTIFY_ERROR]", e));
      }

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
                            <BulkStatusUpdateContent 
                                count={selectedIds.size} 
                                onConfirm={handleBulkStatusUpdate} 
                                isProcessing={isBulkProcessing} 
                            />
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
                <RefreshCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
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
                    <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Shipper/Customer</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Weight</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Landed Cost (JMD)</TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && filtered.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-20">
                            <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" />
                        </TableCell>
                    </TableRow>
                ) : (
                    filtered.map(s => {
                        const freight = Number(s.total_cost_jmd) || calculateShippingCost(Number(s.weight_lbs) || 0);
                        const duty = Number(s.duty_jmd) || 0;
                        const grandTotal = freight + duty;

                        return (
                            <TableRow key={s.id} className={cn("h-20 hover:bg-primary/5 transition-colors", selectedIds.has(s.id) && "bg-primary/10")}>
                                <TableCell className="pl-6">
                                    <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                                </TableCell>
                                <TableCell>
                                    <p className="font-mono font-black text-primary uppercase text-sm">{s.tracking_number}</p>
                                    <p className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[150px]">{s.contents || 'No Description'}</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black uppercase">{new Date(s.created_at).toLocaleDateString()}</p>
                                        <p className="text-[8px] font-bold opacity-40">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="bg-muted p-1.5 rounded-lg">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                      <div>
                                        <p className="font-bold text-xs uppercase italic">{s.profiles?.full_name || 'N/A'}</p>
                                        <p className="text-[9px] font-mono opacity-60 uppercase">{s.profiles?.mailbox_number}</p>
                                      </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 items-start">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase italic border-2">{s.status}</Badge>
                                        {s.logicware_status && (
                                            <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 px-1 italic">
                                                Hub: {s.logicware_status}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-bold uppercase">{s.weight_lbs ? `${s.weight_lbs} LBS` : '—'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-black italic tracking-tighter text-primary">JMD ${grandTotal.toLocaleString()}</p>
                                        {duty > 0 && <p className="text-[8px] font-bold uppercase opacity-40">Inc. ${duty.toLocaleString()} Duty</p>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                <div className="flex justify-end gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleSyncShipment(s.id)}
                                        disabled={syncingShipmentId === s.id}
                                        className="hover:bg-blue-50 text-blue-600 h-8 w-8"
                                        title="Sync to Logicware"
                                    >
                                        {syncingShipmentId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                    </Button>
                                    <ShipmentCustomsDialog shipment={s} onUpdate={() => fetchData(true)} />
                                    <StatusUpdateDialog 
                                    shipment={s} 
                                    onUpdate={(newStatus) => handleStatusUpdate(s.id, newStatus)} 
                                    />
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-destructive/5 text-muted-foreground hover:text-destructive h-8 w-8">
                                        <Trash2 className="h-3.5 w-3.5" />
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
                        );
                    })
                )}
                {filtered.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center text-muted-foreground italic opacity-30">
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

function ShipmentCustomsDialog({ shipment, onUpdate }: { shipment: any, onUpdate: () => void }) {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [category, setCategory] = useState<CustomsCategory>((shipment.customs_category as CustomsCategory) || 'GENERAL');
    const [itemValue, setItemValue] = useState(shipment.customs_value_usd?.toString() || '');
    const [calculatedDuty, setCalculatedDuty] = useState(shipment.duty_jmd || 0);

    const freight = Number(shipment.total_cost_jmd) || calculateShippingCost(shipment.weight_lbs);

    const handleCalculate = useCallback(() => {
        const val = parseFloat(itemValue) || 0;
        const result = calculateCustomsDuty({
            category,
            customsValueUsd: val,
            shippingJmd: freight
        });
        setCalculatedDuty(result.totalDutyJmd);
    }, [itemValue, category, freight]);

    useEffect(() => {
        if (open) handleCalculate();
    }, [itemValue, category, open, handleCalculate]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('shipments')
                .update({
                    customs_category: category,
                    customs_value_usd: parseFloat(itemValue) || 0,
                    duty_jmd: calculatedDuty
                })
                .eq('id', shipment.id);
            
            if (error) throw error;
            toast({ title: "Customs Registry Updated" });
            setOpen(false);
            onUpdate();
        } catch (err: any) {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-8 w-8", calculatedDuty > 0 ? "text-indigo-600 hover:bg-indigo-50" : "text-muted-foreground hover:bg-primary/5")} title="Customs Duty">
                    <Gavel className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl border-4">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Gavel className="h-6 w-6 text-indigo-500" /> JCA Registry Entry
                    </DialogTitle>
                    <DialogDescription className="font-bold text-[9px] uppercase tracking-widest">Tracking: {shipment.tracking_number}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-60">JCA Category</Label>
                            <Select onValueChange={(v: CustomsCategory) => setCategory(v)} defaultValue={category}>
                                <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GENERAL">General Goods (20%)</SelectItem>
                                    <SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0%)</SelectItem>
                                    <SelectItem value="CELL_PHONES">Cell Phones (20%)</SelectItem>
                                    <SelectItem value="AUTO_PARTS">Auto Parts (30%)</SelectItem>
                                    <SelectItem value="COSMETICS">Cosmetics (20%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-60">Item Value (USD)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                <Input type="number" value={itemValue} onChange={e => setItemValue(e.target.value)} className="h-11 pl-10 text-lg font-bold border-2" placeholder="0.00" />
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-200 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold uppercase opacity-60">
                            <span>Freight (Fixed)</span>
                            <span>JMD ${freight.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-indigo-700">Calculated Duty</span>
                            <span className="text-xl font-black italic text-indigo-800 tracking-tighter">+ JMD ${calculatedDuty.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t-2 border-indigo-100 flex justify-between items-center">
                            <span className="text-sm font-black uppercase tracking-tighter">Grand Total</span>
                            <span className="text-2xl font-black italic text-indigo-700 tracking-tighter">JMD ${(freight + calculatedDuty).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 font-black uppercase italic shadow-xl bg-indigo-600 hover:bg-indigo-500">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Save Customs
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StatusUpdateDialog({ shipment, onUpdate }: { shipment: any, onUpdate: (status: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(shipment.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const isTransitioningToReady = status === 'Ready for pick up';

  const handleConfirm = async () => {
    if (isTransitioningToReady && !requiresConfirmation) {
        setRequiresConfirmation(true);
        return;
    }
    setIsUpdating(true);
    await onUpdate(status);
    setIsUpdating(false);
    setRequiresConfirmation(false);
    setOpen(false);
  };

  useEffect(() => {
      if (!open) {
          setRequiresConfirmation(false);
          setStatus(shipment.status);
      }
  }, [open, shipment.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-primary/5 h-8 w-8">
          <History className="h-3.5 w-3.5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Package Transit State</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          {!requiresConfirmation ? (
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
          ) : (
              <div className="p-4 rounded-xl bg-orange-50 border-2 border-dashed border-orange-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 text-orange-700">
                    <AlertCircle className="h-6 w-6" />
                    <h3 className="font-black uppercase italic tracking-tight">Audit Verification</h3>
                </div>
                <p className="text-xs font-bold text-orange-800 leading-relaxed uppercase">
                    You are marking this item as **Ready for Pickup**. Please ensure all customs duties have been reviewed and applied to the registry.
                </p>
              </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {requiresConfirmation ? (
              <Button variant="outline" onClick={() => setRequiresConfirmation(false)} className="h-12 font-bold uppercase w-full">Back</Button>
          ) : (
              <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
          )}
          <Button 
            onClick={handleConfirm} 
            disabled={isUpdating || (!requiresConfirmation && status === shipment.status)} 
            className={cn("flex-1 h-12 font-black uppercase italic shadow-xl", isTransitioningToReady && "bg-orange-600 hover:bg-orange-500")}
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
            {requiresConfirmation ? "Confirm & Finalize" : "Update State"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkStatusUpdateContent({ count, onConfirm, isProcessing }: { count: number, onConfirm: (status: string) => Promise<void>, isProcessing: boolean }) {
    const [status, setStatus] = useState('');
    const [requiresConfirmation, setRequiresConfirmation] = useState(false);

    const isTransitioningToReady = status === 'Ready for pick up';

    const handleAction = () => {
        if (isTransitioningToReady && !requiresConfirmation) {
            setRequiresConfirmation(true);
            return;
        }
        onConfirm(status);
    };

    return (
        <div className="py-6 space-y-6">
            {!requiresConfirmation ? (
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase opacity-60">New Target Status for {count} Items</Label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-14 text-lg font-black border-2"><SelectValue placeholder="Select new state" /></SelectTrigger>
                        <SelectContent>
                            {SHIPMENT_STATUSES.map(st => <SelectItem key={st} value={st} className="font-bold uppercase text-xs">{st}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="p-4 rounded-xl bg-orange-50 border-2 border-dashed border-orange-200 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3 text-orange-700">
                        <AlertCircle className="h-6 w-6" />
                        <h3 className="font-black uppercase italic tracking-tight">Bulk Audit Alert</h3>
                    </div>
                    <p className="text-xs font-bold text-orange-800 leading-relaxed uppercase">
                        You are transitioning **{count} packages** to Ready for Pickup. Confirm that customs duties for ALL selected items are accurately recorded.
                    </p>
                </div>
            )}

            <DialogFooter className="gap-2">
                {requiresConfirmation && <Button variant="outline" onClick={() => setRequiresConfirmation(false)} className="h-12 font-bold uppercase w-full">Back</Button>}
                <Button onClick={handleAction} disabled={isProcessing || !status} className={cn("w-full h-12 font-black uppercase italic shadow-xl", isTransitioningToReady && "bg-orange-600")}>
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {requiresConfirmation ? "Confirm Bulk Readiness" : "Execute Transition"}
                </Button>
            </DialogFooter>
        </div>
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
    const [formData, setFormData] = useState({ flightNumber: '', date: '', carrier: '', origin: 'Florida', destination: 'Jamaica', type: 'Air' });

    useEffect(() => {
        setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

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
