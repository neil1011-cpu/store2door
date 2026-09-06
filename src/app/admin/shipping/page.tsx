
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader2, Search, Zap, RefreshCw, Eye, Package } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function ShippingPage() {
  const { supabase } = useSupabase();
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchShipments = async () => {
      const { data } = await supabase
        .from('shipments')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      setShipments(data || []);
      setIsLoading(false);
    };
    fetchShipments();

    const channel = supabase.channel('shipment-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
            fetchShipments();
        })
        .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!searchTerm) return shipments;
    return shipments.filter(s => s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [shipments, searchTerm]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Shipping Ledger</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px]">Real-time Supabase Logistics Gateway</p>
        </div>
        <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Package className="h-4 w-4" /> Global Registry</CardTitle>
            <Input placeholder="Search tracking..." className="max-w-xs h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
                <TableRow>
                    <TableHead className="pl-6">Tracking ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Cost</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.map(s => (
                    <TableRow key={s.id}>
                        <TableCell className="pl-6 font-mono font-bold text-primary">{s.tracking_number}</TableCell>
                        <TableCell className="font-bold text-xs uppercase">{s.profiles?.full_name}</TableCell>
                        <TableCell><Badge>{s.status}</Badge></TableCell>
                        <TableCell className="text-right pr-6 font-black">JMD ${Number(s.total_cost_jmd).toLocaleString()}</TableCell>
                    </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-40">No shipments found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
