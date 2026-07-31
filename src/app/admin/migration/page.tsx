
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  DatabaseZap,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { getDocs, collection, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

const NEW_DEFAULT_ADDRESS = {
    address1: '3507 NW 19th ST',
    city: 'Lauderdale Lake',
    state: 'FL',
    zip: '33311-4224',
};

export default function MigrationPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isPurging, setIsPurging] = useState(false);
  const [isUpdatingAddresses, setIsUpdatingAddresses] = useState(false);
  const [logs, setLogs] = useState<{message: string, type: 'success' | 'error' | 'info' | 'purge'}[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const runPurgeReset = async () => {
    setIsPurging(true);
    setLogs([{ message: "INITIATING GLOBAL SYSTEM PURGE PROTOCOL...", type: 'purge' }]);
    
    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) throw new Error('Administrative authorization required.');
      const idToken = await currentUser.getIdToken(true);

      const res = await fetch('/api/admin/purge-users', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
          }
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'System reset protocol failed.');

      setLogs(prev => [...prev, { message: `SUCCESS: Permanently removed ${result.deletedCount} user accounts.`, type: 'success' }]);
      setLogs(prev => [...prev, { message: "MAILBOX COUNTER RESET TO FSTD101.", type: 'info' }]);
      
      toast({ title: "System Cleared", description: "All client registries have been purged and mailbox sequence reset." });
    } catch (err: any) {
      setLogs(prev => [...prev, { message: `CRITICAL SYSTEM ERROR: ${err.message}`, type: 'error' }]);
      toast({ title: 'Purge Aborted', description: err.message, variant: 'destructive' });
    } finally {
      setIsPurging(false);
    }
  };

  const updateAllUserAddresses = async () => {
      if (!firestore) return;
      setIsUpdatingAddresses(true);
      setLogs([{ message: "SYNCING ALL CLIENT ADDRESSES TO LAUDERDALE LAKE HUB...", type: 'info' }]);
      try {
          const snapshot = await getDocs(collection(firestore, 'users'));
          const total = snapshot.size;
          setProgress({ current: 0, total });

          for (const userDoc of snapshot.docs) {
              const data = userDoc.data();
              const mailbox = data.mailboxNumber || 'HUB';
              
              await updateDoc(userDoc.ref, {
                  address: {
                      ...NEW_DEFAULT_ADDRESS,
                      address2: `${mailbox}-FSTD`,
                  }
              });

              setLogs(prev => [...prev, { message: `MIGRATED: ${mailbox}`, type: 'success' }]);
              setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }

          toast({ title: "Address Sync Complete", description: `Successfully updated ${total} worldwide shipping profiles.` });
      } catch (err: any) {
          toast({ title: "Batch Sync Failed", description: err.message, variant: "destructive" });
      } finally {
          setIsUpdatingAddresses(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
      <Card className="border-t-4 border-t-primary shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 pb-8">
          <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl"><DatabaseZap className="h-8 w-8 text-primary" /></div>
              <div>
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Administrative Migration & Reset</CardTitle>
                  <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Global Logistics OS Control Console</CardDescription>
              </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Database Purification</Label>
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-black uppercase italic text-destructive flex items-center gap-2">
                            <Trash2 className="h-4 w-4" /> Global Registry Purge
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-[10px] font-medium leading-relaxed opacity-70">
                            Permanently removes every non-admin user record and history. 
                            Resets the automated mailbox sequence to FSTD101.
                        </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full font-black uppercase italic text-[10px] h-10 shadow-lg" disabled={isPurging || isUpdatingAddresses}>
                                    Initiate Full System Wipe
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-center">Confirm Irreversible Reset</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium uppercase text-[10px] tracking-widest leading-relaxed text-center">
                                        This protocol will permanently delete every client record, shipping history, and credential unless they are marked as an administrator. 
                                        This action is final and non-recoverable.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="p-6 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex gap-4 items-center">
                                    <AlertTriangle className="h-12 w-12 text-red-600 shrink-0 animate-pulse" />
                                    <p className="text-[10px] font-black text-red-800 uppercase leading-relaxed">
                                        Mailbox numbering will restart at FSTD101. All historical invoices, transits, and pre-alerts will be purged from the worldwide database.
                                    </p>
                                </div>
                                <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel className="font-bold uppercase h-12">Cancel Abort</AlertDialogCancel>
                                    <AlertDialogAction onClick={runPurgeReset} className="bg-destructive text-white font-black uppercase italic tracking-tight h-12 flex-1 shadow-lg">Authorize Full Wipe Now</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
             </div>

             <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Infrastructure Maintenance</Label>
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-black uppercase italic text-blue-700 flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Lauderdale Lake Migration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-[10px] font-medium leading-relaxed opacity-70">
                            Updates all existing user shipping addresses to our current Florida target: 
                            3507 NW 19th ST, Lauderdale Lake, FL.
                        </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Button onClick={updateAllUserAddresses} variant="outline" size="sm" className="w-full font-black uppercase italic text-[10px] h-10 border-blue-200 text-blue-700 hover:bg-blue-100" disabled={isPurging || isUpdatingAddresses}>
                            Force Address Synchronization
                        </Button>
                    </CardFooter>
                </Card>
             </div>
          </div>

          {(isPurging || isUpdatingAddresses) && (
            <div className="space-y-4 py-4 bg-muted/20 p-6 rounded-2xl border-2 border-dashed">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span>Registry Progress: {progress.current} / {progress.total}</span>
                <span className="animate-pulse text-primary italic">Processing Global Data...</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 100} className="h-3 bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-60 tracking-widest">System Activity Diagnostic Console</Label>
            <ScrollArea className="h-[250px] w-full rounded-2xl border-2 bg-zinc-950 p-4 shadow-inner">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 opacity-30"><Loader2 className="h-5 w-5 animate-spin mb-2" /><p className="text-[9px] uppercase font-black">Awaiting Administrative Instruction...</p></div>
                ) : (
                    <div className="space-y-1 font-mono text-[10px]">
                        {logs.map((log, i) => (
                            <div key={i} className={cn(
                                log.type === 'success' ? 'text-green-400' : 
                                log.type === 'error' ? 'text-red-400' : 
                                log.type === 'purge' ? 'text-orange-400 font-black italic underline' : 'text-zinc-500'
                            )}>
                                [{new Date().toLocaleTimeString()}] {log.type === 'success' ? '✓ ' : log.type === 'error' ? '✗ ' : '○ '}
                                {log.message}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
