'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { MoreHorizontal, PlusCircle, ArrowLeft, RefreshCw, Zap, Plane, Ship, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function ManifestsPage() {
  const { toast } = useToast();
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [logicwareManifests, setLogicwareManifests] = useState<Manifest[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [newManifest, setNewManifest] = useState<Omit<Manifest, 'id' | 'isLogicware'>>({
    flightNumber: '',
    date: '',
    origin: '',
    destination: '',
    status: 'Scheduled',
    type: 'Air',
    carrier: ''
  });

  const fetchLogicwareManifests = async () => {
    if (!isMounted) return;
    setIsFetching(true);
    try {
      const response = await fetch('/api/admin/logicware-manifests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Sync failed');

      const raw = data.manifests || [];
      const mapped: Manifest[] = raw.map((m: any) => ({
          id: `lw-${m.id}`,
          // Hub can return code, manifestNumber, or flightNumber
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
      toast({ 
          title: 'Success', 
          description: `Loaded ${mapped.length} worldwide records.` 
      });
    } catch (error: any) {
      toast({ title: 'Sync Error', description: error.message, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
        fetchLogicwareManifests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  const combinedManifests = useMemo(() => {
    return [...manifests, ...logicwareManifests].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [manifests, logicwareManifests]);

  const handleCreateManifest = () => {
    if (!newManifest.flightNumber) return;
    const manifestToAdd: Manifest = {
        id: `local-${Date.now()}`,
        ...newManifest,
        isLogicware: false
    };
    setManifests([...manifests, manifestToAdd]);
    setOpen(false);
    setNewManifest({
        flightNumber: '',
        date: '',
        origin: '',
        destination: '',
        status: 'Scheduled',
        type: 'Air',
        carrier: ''
    });
  };

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('closed') || s.includes('arrived')) return 'secondary';
    if (s.includes('open') || s.includes('departed')) return 'default';
    return 'outline';
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Worldwide Manifests</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">
            Synchronized flight and voyage tracking for global logistics.
          </p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareManifests} variant="outline" disabled={isFetching} className="font-bold border-2">
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync External Hub
            </Button>
            <Button variant="outline" asChild className="font-bold border-2">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold shadow-lg">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Manifest
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle className="uppercase italic tracking-tighter text-center">Establish Local Route</DialogTitle>
                <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Manual flight or voyage entry</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-[10px] font-black uppercase opacity-60">Route #</Label>
                        <Input value={newManifest.flightNumber} onChange={(e) => setNewManifest({...newManifest, flightNumber: e.target.value})} className="col-span-3 h-11 border-2 font-mono" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-[10px] font-black uppercase opacity-60">Value Date</Label>
                        <Input type="date" value={newManifest.date} onChange={(e) => setNewManifest({...newManifest, date: e.target.value})} className="col-span-3 h-11 border-2" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-[10px] font-black uppercase opacity-60">Initial State</Label>
                        <Select onValueChange={(v: any) => setNewManifest({...newManifest, status: v})} defaultValue={newManifest.status}>
                            <SelectTrigger className="col-span-3 h-11 border-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleCreateManifest} className="w-full h-12 font-black uppercase italic shadow-xl">Authorize Route Entry</Button></DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Unified Manifest Ledger</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Master records from local operations and global hub.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-12">
                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Route #</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Carrier</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Dest</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching && combinedManifests.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : combinedManifests.map((manifest) => (
                <TableRow key={manifest.id} className={cn("hover:bg-primary/5 transition-colors h-16", manifest.isLogicware && "bg-blue-50/20 dark:bg-blue-950/10")}>
                  <TableCell className="pl-6">
                    {manifest.type === 'Sea' ? <Ship className="h-4 w-4 text-blue-500" /> : <Plane className="h-4 w-4 text-primary" />}
                  </TableCell>
                  <TableCell className="font-black uppercase tracking-tighter">{manifest.flightNumber}</TableCell>
                  <TableCell className="text-[10px] font-bold opacity-60 uppercase">{manifest.carrier || 'N/A'}</TableCell>
                  <TableCell className="text-[10px] font-medium">{new Date(manifest.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-[10px] font-bold uppercase">
                    <span className="opacity-40">{manifest.origin}</span>
                    <span className="mx-1">→</span>
                    <span>{manifest.destination}</span>
                  </TableCell>
                  <TableCell><Badge variant={getStatusVariant(manifest.status as string)} className="text-[8px] font-black uppercase italic tracking-widest border-2">{manifest.status}</Badge></TableCell>
                  <TableCell className="text-right pr-6">
                    {manifest.isLogicware ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[8px] font-black italic">Hub</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 uppercase text-[8px] font-black italic">Local</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {combinedManifests.length === 0 && !isFetching && (
                <TableRow><TableCell colSpan={7} className="text-center h-48 opacity-30 italic">No worldwide routes logged.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
