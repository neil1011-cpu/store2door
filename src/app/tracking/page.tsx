
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, Search, Loader2, PackageSearch, ExternalLink, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Shipment } from '@/lib/types';
import Link from 'next/link';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const firestore = useFirestore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = trackingNumber.trim().toUpperCase();
    if (!tid) return;

    setLoading(true);
    setError(null);
    setShipment(null);
    setHasSearched(true);
    
    try {
        // 1. Search local Firebase database
        const q = query(
            collectionGroup(firestore, 'shipments'), 
            where('trackingNumber', '==', tid)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Shipment;
            setShipment({ ...data, id: snapshot.docs[0].id, source: 'Internal' });
        } else {
            // 2. Search Logicware network as fallback
            const key = localStorage.getItem('LOGICWARE_API_KEY');
            if (key) {
                const lwRes = await fetch('/api/admin/logicware-shipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: key })
                });
                const lwData = await lwRes.json();
                if (lwData.success) {
                    const match = lwData.shipments.find((s: any) => s.trackingNumber === tid);
                    if (match) {
                        setShipment({ ...match, source: 'External' });
                    }
                }
            }
        }
    } catch (err: any) {
        console.error("Tracking Error:", err);
        setError("An error occurred while fetching tracking details.");
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
    if (!isMounted) return '...'; // Prevent hydration mismatch
    try {
        if (typeof ts === 'string') return new Date(ts).toLocaleDateString();
        if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString();
        return new Date(ts).toLocaleDateString();
    } catch (e) {
        return 'N/A';
    }
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
              <CardDescription className="text-base">Unified search across Firebase and Logicware networks.</CardDescription>
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
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current Status</p>
                            {shipment.source === 'External' && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] h-4">External Network</Badge>
                            )}
                        </div>
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
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Date Logged</p>
                        <p className="text-lg font-semibold">{formatTimestamp(shipment.shippingDate)}</p>
                    </div>
                </div>
                
                <div className="pt-4 border-t">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Shipment Contents</p>
                    <p className="text-lg italic text-foreground">"{shipment.contents}"</p>
                </div>

                {shipment.source === 'External' ? (
                     <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/20 flex items-start gap-4">
                        <Globe className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-blue-700 dark:text-blue-400">Hub Package Detected</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                This package was found in our global logistics hub. You can view the full manifest directly.
                            </p>
                            <Button asChild variant="link" className="p-0 h-auto mt-2 text-blue-600">
                                <Link href={shipment.externalUrl || '#'} target="_blank">
                                    View Full Manifest <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex items-start gap-4">
                        <Truck className="h-6 w-6 text-primary shrink-0 mt-1" />
                        <div>
                            <p className="font-bold">Estimated Delivery</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Your package is moving through our local network. You will receive an update once it arrives in Jamaica and clears customs.
                            </p>
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>
          )}

          {hasSearched && !loading && !shipment && !error && (
            <Alert className="bg-amber-50 border-amber-200">
              <Truck className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">No Shipment Found</AlertTitle>
              <AlertDescription className="text-amber-700">
                We couldn't find a record for <strong>{trackingNumber}</strong> in any of our networks. It may still be in transit to our Florida warehouse or being processed.
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
