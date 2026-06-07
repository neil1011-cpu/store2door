
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const auth = useAuth();

  useEffect(() => {
    console.error('Account Dashboard Exception:', error);
  }, [error]);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/signin';
  };

  return (
    <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center text-center">
      <div className="bg-orange-100 dark:bg-orange-950/30 p-6 rounded-2xl mb-6">
        <ShieldAlert className="h-12 w-12 text-orange-600" />
      </div>
      <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Session Sync Failure</h1>
      <p className="text-muted-foreground max-w-md mb-8 text-sm">
        We encountered an issue retrieving your secure profile data. This usually happens when your security token expires.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
        <Button onClick={() => reset()} variant="secondary" className="font-bold h-12">
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry Sync
        </Button>
        <Button onClick={handleSignOut} className="font-bold h-12">
          <LogIn className="mr-2 h-4 w-4" /> Re-Authenticate
        </Button>
      </div>
    </div>
  );
}
