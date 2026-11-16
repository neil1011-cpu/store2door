'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Edit, Trash2, PlusCircle, Loader2, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pricingTiers as defaultTiers, type ShippingRates } from '@/lib/utils';

type LocalTier = {
    weight: number;
    price: number;
};

export default function RatesPage() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<LocalTier[]>([]);
  const [base30, setBase30] = useState(12250);
  const [increment, setIncrement] = useState(400);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      
      let finalTiers: LocalTier[] = [];
      
      if (data && data.tiers) {
          finalTiers = Object.entries(data.tiers).map(([w, p]) => ({
              weight: parseInt(w),
              price: Number(p)
          }));
          setBase30(data.base_rate_30lb || 12250);
          setIncrement(data.increment_above_30lb || 400);
      } else {
          // Use default fallback
          finalTiers = Object.entries(defaultTiers).map(([w, p]) => ({
              weight: parseInt(w),
              price: Number(p)
          }));
      }

      setTiers(finalTiers.sort((a, b) => a.weight - b.weight));
    } catch (error: any) {
        toast({ title: 'Registry Sync Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleEdit = (tier: LocalTier) => {
    setEditingWeight(tier.weight);
    setTempPrice(tier.price);
  };

  const handleApplyLocal = (weight: number) => {
    const updated = tiers.map(t => 
        t.weight === weight ? { ...t, price: tempPrice } : t
    );
    setTiers(updated);
    setEditingWeight(null);
  };

  const handleGlobalSave = async () => {
      setIsSaving(true);
      try {
          const tierMap: Record<string, number> = {};
          tiers.forEach(t => { tierMap[t.weight.toString()] = t.price; });

          const payload: ShippingRates = {
              tiers: tierMap,
              base_rate_30lb: base30,
              increment_above_30lb: increment
          };

          const res = await fetch('/api/admin/settings/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'shipping_rates', value: payload })
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.message || 'Failed to authorize registry update.');

          toast({ title: "Registry Updated", description: "All customers and admins are now using these rates." });
      } catch (err: any) {
          toast({ title: "Save Rejected", description: err.message, variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  if (isLoading) {
      return (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Decrypting Rate Registry...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Courier Rates</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] mt-1">Global Shipping Registry Management</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRates} className="font-bold border-2"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            <Button onClick={handleGlobalSave} disabled={isSaving} className="font-black uppercase italic shadow-xl">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Authorize Registry Update
            </Button>
            <Button variant="outline" asChild className="font-bold border-2">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 shadow-xl border-none overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-xs font-black uppercase tracking-widest italic">Standard Weight Tiers (1 - 30 lbs)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-[10px] font-black uppercase">Weight Bracket</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Price (JMD $)</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tiers.map((tier) => (
                            <TableRow key={tier.weight} className="h-14 hover:bg-primary/5 transition-colors">
                                <TableCell className="pl-6 font-mono font-bold text-sm">{tier.weight} lb</TableCell>
                                <TableCell>
                                    {editingWeight === tier.weight ? (
                                        <Input 
                                            type="number" 
                                            value={tempPrice} 
                                            onChange={(e) => setTempPrice(Number(e.target.value))}
                                            className="max-w-[150px] h-9 font-bold text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-black italic text-sm">JMD ${tier.price.toLocaleString()}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    {editingWeight === tier.weight ? (
                                        <div className="flex gap-1 justify-end">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleApplyLocal(tier.weight)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingWeight(null)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(tier)} className="h-8 text-[10px] font-bold uppercase hover:bg-primary hover:text-primary-foreground">
                                            Edit Tier
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-lg border-2 border-dashed border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">Extended Brackets (31+ lbs)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Base Price (30lb)</Label>
                        <Input type="number" value={base30} onChange={e => setBase30(Number(e.target.value))} className="h-11 border-2 font-black italic" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Increment Per LB Over 30</Label>
                        <Input type="number" value={increment} onChange={e => setIncrement(Number(e.target.value))} className="h-11 border-2 font-black italic" />
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/20 p-4">
                    <p className="text-[8px] font-bold uppercase text-muted-foreground leading-relaxed">Example: 35lbs = ${base30} + (5 * ${increment}) = JMD ${(base30 + 5 * increment).toLocaleString()}</p>
                </CardFooter>
            </Card>

            <div className="p-6 rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-indigo-700">Monotonic Rule Active</h4>
                <p className="text-[10px] font-medium leading-relaxed text-indigo-800/70 uppercase">
                    The registry will reject any update where a heavier bracket costs less than the previous one. Ensure your rate sheet is sequentially valid.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}