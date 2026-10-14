'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Zap, Plane, Ship, Loader2, RefreshCw, ChevronDown, ChevronRight, Package, Trash2, Edit2, Info, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Manifest } from '@/lib/types';
import { useSupabase } from '@/components/supabase-provider';
import { Separator } from '@/components/ui/separator';

export default function ManifestsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [localManifests, setLocalManifests] = useState<Manifest[]>([]);
  const [logicwareManifests, setLogicwareManifests] = useState<Manifest[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Detail/Edit State
  const [expandedManifestId, setExpandedManifestId] = useState<string | null>(null);
  const [manifestParcels, setManifestParcels] = useState<any[]>([]);
  const [isLoadingParcels, setIsLoadingParcels] = useState(false);

  const [newManifest, setNewManifest] = useState<Omit<Manifest, 'id' | 'isLogicware'>>({
    flightNumber: '',
    date: '',
    origin: 'Florida',
    destination: 'Jamaica',
    status: 'Scheduled',
    type: 'Air',
    carrier: ''
  });

  const fetchLogicwareManifests = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logicware-manifests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Hub sync failure');

      const raw = data.manifests || [];
      const mapped: Manifest[] = raw.map((m: any) => ({
          id: `lw-${m.id || Math.random()}`,
          flightNumber: m.code || m.manifestNumber || m.voyageNumber || m.flightNumber || 'HUBSYNC',
          date: m.departureDate || m.date || new Date().toISOString(),
          origin: m.originPort || m.origin || 'N/A',
          destination: m.destinationPort || m.destination || 'N/A',
          status: m.status?.name || m.status || 'Open',
          type: m.type === 'Sea' ? 'Sea' : 'Air',
          carrier: m.carrier || m.airline || m.vessel || '',
          isLogicware: true
      }));

      setLogicwareManifests(mapped);
    } catch (error: any) {
      console.warn('[HUB_SYNC_WARN]', error.message);
    }
  }, []);

  const fetchLocalManifests = useCallback(async () => {
    try {
        const { data, error } = await supabase
            .from('manifests')
            .select('*')
            .order('manifest_date', { ascending: false });
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('[LOCAL_REGISTRY] Manifests table missing.');
                return;
            }
            throw error;
        }

        const mapped: Manifest[] = (data || []).map(m => ({
            id: m.id,
            flightNumber: m.flight_number,
            date: m.manifest_date,
            origin: m.origin,
            destination: m.destination,
            status: m.status,
            type: m.manifest_type === 'Sea' ? 'Sea' : 'Air',
            carrier: m.carrier,
            isLogicware: false
        }));

        setLocalManifests(mapped);
    } catch (err: any) {
        console.error('[LOCAL_FETCH_ERROR]', err.message || err);
    }
  }, [supabase]);

  const fetchAllData = useCallback(async () => {
    setIsFetching(true);
    await Promise.allSettled([fetchLocalManifests(), fetchLogicwareManifests()]);
    setIsFetching(false);
  }, [fetchLocalManifests, fetchLogicwareManifests]);

  const fetchParcels = useCallback(async (manifestId: string) => {
    setIsLoadingParcels(true);
    try {
        const { data, error } = await supabase
            .from('shipments')
            .select('*, profiles(full_name, mailbox_number)')
            .eq('manifest_id', manifestId);
        
        if (error) throw error;
        setManifestParcels(data || []);
    } catch (err: any) {
        toast({ title: "Fetch Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsLoadingParcels(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
        fetchAllData();
    }
  }, [isMounted, fetchAllData]);

  useEffect(() => {
    if (expandedManifestId && !expandedManifestId.startsWith('lw-')) {
        fetchParcels(expandedManifestId);
    } else {
        setManifestParcels([]);
    }
  }, [expandedManifestId, fetchParcels]);

  const handleCreateManifest = async () => {
    if (!newManifest.flightNumber) return;
    
    try {
        const { error } = await supabase.from('manifests').insert({
            flight_number: newManifest.flightNumber,
            manifest_date: newManifest.date,
            carrier: newManifest.carrier,
            origin: newManifest.origin,
            destination: newManifest.destination,
            status: newManifest.status,
            manifest_type: newManifest.type
        });

        if (error) throw error;

        toast({ title: "Manifest Established" });
        setOpen(false);
        setNewManifest({
            flightNumber: '',
            date: '',
            origin: 'Florida',
            destination: 'Jamaica',
            status: 'Scheduled',
            type: 'Air',
            carrier: ''
        });
        fetchLocalManifests();
    } catch (err: any) {
        toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveFromManifest = async (shipmentId: string) => {
    try {
        const { error } = await supabase
            .from('shipments')
            .update({ manifest_id: null })
            .eq('id', shipmentId);
        
        if (error) throw error;
        toast({ title: "Parcel Removed", description: "Shipment is now unassigned." });
        if (expandedManifestId) fetchParcels(expandedManifestId);
    } catch (err: any) {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('closed') || s.includes('arrived')) return 'secondary';
    if (s.includes('open') || s.includes('departed')) return 'default';
    return 'outline';
  }

  const combinedManifests = useMemo(() => {
    return [...localManifests, ...logicwareManifests].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [localManifests, logicwareManifests]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Route Registry</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">
            Manage your cargo groupings and flight manifests.
          </p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline" disabled={isFetching} className="font-bold border-2">
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Records
            </Button>
            <Button variant="outline" asChild className="font-bold border-2">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="font-black uppercase italic shadow-lg">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Route
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">New Route Profile</DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Establish a container for parcels</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase opacity-60">Route / Flight ID</Label>
                            <Input value={newManifest.flightNumber} onChange={(e) => setNewManifest({...newManifest, flightNumber: e.target.value.toUpperCase()})} className="h-11 border-2 font-mono" placeholder="e.g. JM456" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase opacity-60">Value Date</Label>
                                <Input type="date" value={newManifest.date} onChange={(e) => setNewManifest({...newManifest, date: e.target.value})} className="h-11 border-2" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase opacity-60">Initial State</Label>
                                <Select onValueChange={(v: any) => setNewManifest({...newManifest, status: v})} defaultValue={newManifest.status}>
                                    <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase opacity-60">Carrier / Vessel Name</Label>
                            <Input value={newManifest.carrier} onChange={(e) => setNewManifest({...newManifest, carrier: e.target.value})} className="h-11 border-2" placeholder="e.g. JetBlue / Amerijet" />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateManifest} className="w-full h-12 font-black uppercase italic shadow-xl">Authorize Route Entry</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Universal Logistics Folders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-12">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Route #</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Type / Carrier</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Origin → Dest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching && combinedManifests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : combinedManifests.map((manifest) => (
                <React.Fragment key={manifest.id}>
                    <TableRow 
                        className={cn(
                            "hover:bg-primary/5 transition-colors h-16 cursor-pointer group", 
                            manifest.isLogicware && "bg-blue-50/20 dark:bg-blue-950/10",
                            expandedManifestId === manifest.id && "bg-primary/5"
                        )}
                        onClick={() => !manifest.isLogicware && setExpandedManifestId(expandedManifestId === manifest.id ? null : manifest.id)}
                    >
                        <TableCell className="pl-6">
                            {!manifest.isLogicware ? (
                                expandedManifestId === manifest.id ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 opacity-40" />
                            ) : null}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                {manifest.type === 'Sea' ? <Ship className="h-4 w-4 text-blue-500" /> : <Plane className="h-4 w-4 text-primary" />}
                                <p className="font-black uppercase tracking-tighter text-sm">{manifest.flightNumber}</p>
                                {manifest.isLogicware ? (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[7px] font-black italic">Hub</Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 uppercase text-[7px] font-black italic">Local</Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold opacity-60 uppercase italic">{manifest.carrier || 'Unspecified'}</TableCell>
                        <TableCell className="text-[10px] font-medium">{new Date(manifest.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(manifest.status as string)} className="text-[8px] font-black uppercase italic tracking-widest border-2">{manifest.status}</Badge></TableCell>
                        <TableCell className="text-right pr-10 text-[10px] font-bold uppercase">
                            <span className="opacity-40">{manifest.origin}</span>
                            <span className="mx-2 text-primary">→</span>
                            <span>{manifest.destination}</span>
                        </TableCell>
                    </TableRow>
                    
                    {/* Expansion Sub-Table */}
                    {expandedManifestId === manifest.id && !manifest.isLogicware && (
                        <TableRow className="bg-muted/10">
                            <TableCell colSpan={6} className="p-0 border-b-4">
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Manifest Contents</p>
                                                <h4 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                                                    <Package className="h-5 w-5 text-primary" /> {manifestParcels.length} Active Parcels
                                                </h4>
                                            </div>
                                            <Separator orientation="vertical" className="h-10" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Total Payload</p>
                                                <p className="font-bold italic text-sm">{manifestParcels.reduce((sum, p) => sum + Number(p.weight_lbs || 0), 0).toFixed(2)} LBS</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <EditManifestDialog manifest={manifest} onUpdate={fetchLocalManifests} />
                                            <Button variant="ghost" size="sm" onClick={() => setExpandedManifestId(null)} className="font-bold uppercase text-[9px]">Close Details</Button>
                                        </div>
                                    </div>

                                    {isLoadingParcels ? (
                                        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div>
                                    ) : manifestParcels.length > 0 ? (
                                        <Table className="bg-background rounded-xl border-2 shadow-sm overflow-hidden">
                                            <TableHeader className="bg-muted/30">
                                                <TableRow className="h-10">
                                                    <TableHead className="pl-6 text-[9px] font-black uppercase tracking-widest">Parcel ID</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Recipient Authority</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Mailbox</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Weight</TableHead>
                                                    <TableHead className="text-right pr-6 text-[9px] font-black uppercase tracking-widest">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {manifestParcels.map(p => (
                                                    <TableRow key={p.id} className="h-12 border-b last:border-0 hover:bg-muted/10 transition-colors">
                                                        <TableCell className="pl-6 font-mono font-bold text-primary text-xs uppercase">{p.tracking_number}</TableCell>
                                                        <TableCell className="text-xs font-black uppercase italic">{p.profiles?.full_name}</TableCell>
                                                        <TableCell className="font-mono text-xs opacity-60">{p.profiles?.mailbox_number}</TableCell>
                                                        <TableCell className="text-xs font-bold">{p.weight_lbs} LBS</TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/5"
                                                                onClick={() => handleRemoveFromManifest(p.id)}
                                                                title="Remove from Manifest"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="p-10 text-center border-2 border-dashed rounded-xl bg-background/50">
                                            <Info className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-4" />
                                            <p className="text-sm font-black uppercase italic tracking-widest opacity-30">This folder is currently empty.</p>
                                            <Button variant="link" asChild className="text-[10px] font-bold uppercase mt-4"><Link href="/admin/shipping">Assign parcels in Shipping Ledger</Link></Button>
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
              ))}
              {combinedManifests.length === 0 && !isFetching && (
                <TableRow><TableCell colSpan={6} className="text-center h-48 opacity-30 italic">No worldwide routes logged.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EditManifestDialog({ manifest, onUpdate }: { manifest: Manifest, onUpdate: () => void }) {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        flightNumber: manifest.flightNumber,
        carrier: manifest.carrier || '',
        date: manifest.date,
        status: manifest.status
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('manifests')
                .update({
                    flight_number: formData.flightNumber,
                    carrier: formData.carrier,
                    manifest_date: formData.date,
                    status: formData.status
                })
                .eq('id', manifest.id);
            
            if (error) throw error;
            toast({ title: "Route Updated" });
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
                <Button variant="outline" size="sm" className="font-black uppercase italic text-[9px] border-2 shadow-sm">
                    <Edit2 className="h-3 w-3 mr-2" /> Edit Route
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Modify Route Details</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase opacity-60">Route / Flight ID</Label>
                        <Input value={formData.flightNumber} onChange={(e) => setFormData({...formData, flightNumber: e.target.value.toUpperCase()})} className="h-11 border-2 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase opacity-60">Transit Date</Label>
                            <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="h-11 border-2" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase opacity-60">Current Status</Label>
                            <Select onValueChange={(v: any) => setFormData({...formData, status: v})} defaultValue={formData.status}>
                                <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                    <SelectItem value="Arrived">Arrived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase opacity-60">Carrier Authority</Label>
                        <Input value={formData.carrier} onChange={(e) => setFormData({...formData, carrier: e.target.value})} className="h-11 border-2" />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="outline" className="h-12 font-bold uppercase w-full">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
