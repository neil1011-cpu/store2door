
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, DatabaseZap, CheckCircle2, AlertTriangle, ShieldAlert, TableProperties, Play, SearchCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { GlobalMigrationReport } from '@/lib/migration-service';

export default function MigrationPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const [isMigrating, setIsMigrating] = useState(false);
  const [report, setReport] = useState<GlobalMigrationReport | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const startMigration = async (dryRun: boolean) => {
    setIsMigrating(true);
    setIsDryRun(dryRun);
    try {
      const idToken = await auth?.currentUser?.getIdToken(true);
      const res = await fetch('/api/admin/migration/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ isDryRun: dryRun })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Migration failed');

      setReport(data.report);
      toast({ 
        title: dryRun ? "Dry Run Complete" : "Migration Complete", 
        description: dryRun ? "Review the counts before authorizing actual writes." : "Shadow copy successful." 
      });
    } catch (err: any) {
      toast({ title: 'Migration Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Phase 3: Data Migration</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Firebase → Supabase Shadow Copy Registry</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => startMigration(true)} disabled={isMigrating} variant="outline" className="font-bold border-2">
                {isMigrating && isDryRun ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
                Run Validation Pass
            </Button>
            <Button onClick={() => startMigration(false)} disabled={isMigrating} className="font-black uppercase italic shadow-lg">
                {isMigrating && !isDryRun ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Authorize Live Migration
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Migration Matrix</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Reconciliation between Source and Target counts.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b h-12">
                                    <th className="pl-6 text-left font-black uppercase text-[10px]">Entity</th>
                                    <th className="text-center font-black uppercase text-[10px]">Attempted</th>
                                    <th className="text-center font-black uppercase text-[10px]">Migrated</th>
                                    <th className="text-center font-black uppercase text-[10px]">Skipped</th>
                                    <th className="pr-6 text-right font-black uppercase text-[10px]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report ? Object.entries(report).map(([key, stats]) => (
                                    <tr key={key} className="border-b h-16 hover:bg-muted/5">
                                        <td className="pl-6 font-bold uppercase italic text-xs">{key.replace('_', ' ')}</td>
                                        <td className="text-center font-mono">{stats.attempted}</td>
                                        <td className="text-center font-mono text-green-600">{stats.migrated}</td>
                                        <td className="text-center font-mono text-orange-600">{stats.skipped}</td>
                                        <td className="pr-6 text-right">
                                            {stats.failed > 0 ? (
                                                <Badge variant="destructive">FAIL ({stats.failed})</Badge>
                                            ) : stats.attempted > 0 ? (
                                                <Badge className="bg-green-500">PASS</Badge>
                                            ) : (
                                                <Badge variant="outline" className="opacity-30">IDLE</Badge>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="h-64 text-center text-muted-foreground italic">No migration data to display. Run validation pass.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-lg bg-zinc-950 text-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">System Log Console</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px] w-full p-4 font-mono text-[10px]">
                        {report ? (
                            <div className="space-y-2">
                                <p className="text-primary italic">[{new Date().toLocaleTimeString()}] RECONCILIATION COMPLETE.</p>
                                {Object.entries(report).flatMap(([entity, stats]) => 
                                    stats.errors.map((err, i) => (
                                        <p key={`${entity}-${i}`} className="text-red-400">
                                            [ERROR] {entity.toUpperCase()}: {err}
                                        </p>
                                    ))
                                )}
                                {report.profiles.migrated === 0 && (
                                    <div className="p-4 border border-dashed border-red-500/30 bg-red-500/10 rounded-xl">
                                        <p className="text-red-400 font-bold">CRITICAL: Identity Mismatch</p>
                                        <p className="opacity-60 leading-relaxed mt-1">No Firebase UIDs found in Supabase Auth. Profiles migration skipped.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <DatabaseZap className="h-8 w-8 mb-2" />
                                <p>Awaiting Trigger...</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    <p className="text-xs font-black uppercase italic tracking-tighter">Hardened Identity Rule</p>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-70">
                    Migration logic enforces strict **Auth Alignment**. Firebase Profiles will only be copied if a matching UID exists in the Supabase Auth Registry.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
