
'use client';

import { Button } from '@/components/ui/button';
import { PackageSearch, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="bg-primary/5 p-8 rounded-3xl mb-8 transform rotate-3 shadow-inner">
        <PackageSearch className="h-16 w-16 text-primary opacity-20" />
      </div>
      <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-2">404</h1>
      <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-primary">Parcels Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-10 text-sm font-medium uppercase tracking-widest leading-relaxed">
        The logistics coordinates you requested do not exist in our global registry. It may have been relocated or purged.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button onClick={() => router.back()} variant="outline" size="lg" className="font-black uppercase italic border-2 flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
        <Button asChild size="lg" className="font-black uppercase italic shadow-xl flex-1">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" /> Station Home
          </Link>
        </Button>
      </div>
      <p className="mt-20 text-[10px] font-bold text-muted-foreground uppercase opacity-30 tracking-[0.3em]">
        FSTD Global Logistics OS • Error: IDENTITY_MISMATCH
      </p>
    </div>
  );
}
