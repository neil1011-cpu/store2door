'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, Search, Loader2, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Shipment } from '@/lib/types';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError(null);
    setShipment(null);
    setHasSearched(true);
    
    try {
        // Query across all users to find this tracking number
        const q = query(
            collectionGroup(firestore, 'shipments'), 
            where('trackingNumber', '==', trackingNumber.trim().toUpperCase())
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Shipment;
            setShipment({ ...data, id: snapshot.docs[0].id });
        } else {
            setShipment(null);
        }
    } catch (err: any) {
        console.error("Tracking Error:", err);
        if (err.message?.includes('index')) {
            setError("The tracking index is being prepared by the system. Please try again in a few minutes.");
        } else {
            setError("An error occurred while fetching tracking details.");
        }
    } finally {
        setLoading(false);
    }
  };
  
  const getStatusVariant = (status: string) => {
    if (status.includes('Delivered')) return 'outline';
    if (status.includes('Transit') || status.includes('Shipped')) return 'default';
    return 'secondary';
  }

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <PackageSearch className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight">Track Your Shipment</CardTitle>
              <CardDescription className="text-base">Enter your tracking number to get instant updates.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="e.g., JM123456789"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="text-lg h-12 flex-grow font-mono uppercase"
                  aria-label="Tracking Number"
                />
                <Button type="submit" disabled={loading} size="lg" className="h-12 px-8">
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-5 w-5" />
                  )}
                  Track
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {shipment && (
            <Card className="shadow-xl border-t-4 border-primary animate-in zoom-in-95 duration-300">
              <CardHeader className="bg-muted/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Current Status</p>
                        <CardTitle className="text-2xl font-black">{shipment.status}</CardTitle>
                    </div>
                    <Badge variant={getStatusVariant(shipment.status)} className="text-base px-6 py-1.5 rounded-full">
                        {shipment.status}
                    </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Tracking ID</p>
                        <p className="font-mono text-lg font-bold">{shipment.trackingNumber}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Processed Date</p>
                        <p className="text-lg font-semibold">{formatTimestamp(shipment.shippingDate)}</p>
                    </div>
                </div>
                
                <div className="pt-4 border-t">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Shipment Contents</p>
                    <p className="text-lg italic text-foreground">"{shipment.contents}"</p>
                </div>

                <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex items-start gap-4">
                    <Truck className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                        <p className="font-bold">Estimated Delivery</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Your package is moving through our logistics network. You will receive an update once it arrives in Jamaica and clears customs.
                        </p>
                    </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasSearched && !loading && !shipment && !error && (
            <Alert className="bg-amber-50 border-amber-200">
              <Truck className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">No Shipment Found</AlertTitle>
              <AlertDescription className="text-amber-700">
                We couldn't find a record for <strong>{trackingNumber}</strong>. It may still be in transit to our Florida warehouse or being processed.
              </AlertDescription>
            </Alert>
          )}

        </div>
      </div>
    </div>
  );
}

function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
