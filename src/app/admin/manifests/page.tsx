
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
    setIsFetching(true);
    try {
      const response = await fetch('/api/admin/logicware-manifests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: localStorage.getItem('LOGICWARE_API_KEY') })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Sync failed');

      const raw = data.manifests || [];
      const mapped: Manifest[] = raw.map((m: any) => ({
          id: `lw-${m.id}`,
          flightNumber: m.manifestNumber || m.voyageNumber || m.flightNumber || m.code || 'N/A',
          date: m.departureDate || m.date || new Date().toISOString(),
          origin: m.originPort || m.origin || 'N/A',
          destination: m.destinationPort || m.destination || 'N/A',
          status: m.status?.name || m.status || 'Open',
          type: m.type === 'Sea' ? 'Sea' : 'Air',
          carrier: m.carrier || m.airline || m.vessel || '',
          isLogicware: true
      }));

      const allCount = manifests.length + mapped.length;
      
      console.log('[FINAL DATA]', { manifestsArray: mapped, total: allCount });

      toast({ 
          title: 'Success', 
          description: `Loaded ${allCount} worldwide records` 
      });

      setLogicwareManifests(mapped);
    } catch (error: any) {
      toast({ title: 'Sync Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchLogicwareManifests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    switch (status) {
        case 'Closed':
        case 'Arrived':
            return 'secondary';
        case 'Open':
        case 'Departed':
            return 'default';
        default:
            return 'outline';
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worldwide Manifests</h1>
          <p className="text-muted-foreground">
            Synchronized flight and voyage tracking for global logistics.
          </p>
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchLogicwareManifests} variant="outline" disabled={isFetching}>
                {isFetching ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                Sync External Hub
            </Button>
            <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Manifest
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create Local Manifest</DialogTitle>
                <DialogDescription>Enter local flight or voyage details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Route #</Label>
                        <Input value={newManifest.flightNumber} onChange={(e) => setNewManifest({...newManifest, flightNumber: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date</Label>
                        <Input type="date" value={newManifest.date} onChange={(e) => setNewManifest({...newManifest, date: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Status</Label>
                        <Select onValueChange={(v: any) => setNewManifest({...newManifest, status: v})} defaultValue={newManifest.status}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleCreateManifest}>Save Manifest</Button></DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unified Manifest List</CardTitle>
          <CardDescription>Records from both local operations and Logicware hub.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Route #</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Route (Origin {'->'} Dest)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching && combinedManifests.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
              ) : combinedManifests.map((manifest) => (
                <TableRow key={manifest.id} className={cn(manifest.isLogicware && "bg-blue-50/30 dark:bg-blue-950/10")}>
                  <TableCell>
                    {manifest.type === 'Sea' ? <Ship className="h-4 w-4 text-blue-500" /> : <Plane className="h-4 w-4 text-primary" />}
                  </TableCell>
                  <TableCell className="font-black uppercase tracking-tighter">{manifest.flightNumber}</TableCell>
                  <TableCell className="text-xs font-bold opacity-70">{manifest.carrier || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{new Date(manifest.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">
                    <span className="font-bold">{manifest.origin}</span>
                    <span className="mx-2 opacity-40">{'->'}</span>
                    <span className="font-bold">{manifest.destination}</span>
                  </TableCell>
                  <TableCell><Badge variant={getStatusVariant(manifest.status as string)} className="text-[10px]">{manifest.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {manifest.isLogicware ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[9px] font-bold">Logicware</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 uppercase text-[9px] font-bold">Local</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {combinedManifests.length === 0 && !isFetching && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No manifests found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
