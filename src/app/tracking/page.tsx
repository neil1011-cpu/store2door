
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Loader2, PackageSearch, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSupabase } from '@/components/supabase-provider';

export default function TrackingPage() {
  const { supabase } = useSupabase();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = trackingNumber.trim().toUpperCase();
    if (!tid) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
        const { data } = await supabase
            .from('shipments')
            .select('*')
            .eq('tracking_number', tid)
            .maybeSingle();
        
        setShipment(data);
    } catch (err) {
        console.error("Tracking Error:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-16 px-4 max-w-2xl">
      <Card className="shadow-lg mb-8">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <PackageSearch className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-black italic uppercase">Track Worldwide</CardTitle>
          <CardDescription>Enter tracking ID to view live Supabase transit data.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrack} className="flex gap-2">
            <Input
              placeholder="e.g., JM..."
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              className="text-lg h-12 font-mono uppercase"
            />
            <Button type="submit" disabled={loading} size="lg" className="h-12 px-8">
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {shipment ? (
        <Card className="shadow-xl border-t-4 border-primary animate-in zoom-in-95">
          <CardHeader>
            <CardTitle className="text-2xl font-black">{shipment.status}</CardTitle>
            <CardDescription>Live update from our logistics hub.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs font-bold uppercase opacity-60">Tracking ID</p><p className="font-mono text-lg font-bold">{shipment.tracking_number}</p></div>
                <div><p className="text-xs font-bold uppercase opacity-60">Status</p><Badge>{shipment.status}</Badge></div>
            </div>
            <div className="pt-4 border-t">
                <p className="text-xs font-bold uppercase opacity-60 mb-2">Shipment Contents</p>
                <p className="text-lg italic font-medium">"{shipment.contents || 'No description available'}"</p>
            </div>
          </CardContent>
        </Card>
      ) : hasSearched && !loading && (
        <Alert className="bg-amber-50">
          <Truck className="h-4 w-4" />
          <AlertTitle>No record found</AlertTitle>
          <AlertDescription>We couldn't locate a shipment for "{trackingNumber}" in the Supabase registry.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
