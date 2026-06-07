
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('System Exception Detected:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="bg-destructive/10 p-6 rounded-full mb-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">System Interruption</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        A critical data synchronization error occurred. This is often caused by an expired session or a network disruption.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => reset()} size="lg" className="font-bold uppercase tracking-tight">
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Reconnecting
        </Button>
        <Button variant="outline" size="lg" asChild className="font-bold uppercase tracking-tight border-2">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" /> Return Home
          </Link>
        </Button>
      </div>
      <p className="mt-12 text-[10px] font-mono text-muted-foreground uppercase opacity-50">
        Error Digest: {error.digest || 'Internal Exception'}
      </p>
    </div>
  );
}
