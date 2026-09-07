'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, AlertCircle, Database, Terminal, RefreshCcw, Table2, Key, CheckCircle2 } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * @fileOverview System Proof & Recovery Center.
 * Displays literal production values to prove configuration state.
 */

export default function SetupAdminPage() {
  const { toast } = useToast();
  const { supabase, user } = useSupabase();
  const [isChecking, setIsChecking] = useState(false);
  const [envNames, setEnvNames] = useState<string[]>([]);
  const [schemaData, setSchemaData] = useState<any>(null);

  const performLiveProof = async () => {
    setIsChecking(true);
    try {
        // 1. Detect active environment variable names
        const names = [];
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) names.push('NEXT_PUBLIC_SUPABASE_URL');
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) names.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        setEnvNames(names);

        // 2. Direct Table Visibility Check (PGRST205 detector)
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        
        if (error) {
            setSchemaData({ status: 'ERROR', message: error.message, code: error.code });
        } else {
            setSchemaData({ status: 'SUCCESS', count: data?.length || 0 });
        }

        toast({ title: "Live Diagnostic Complete" });
    } catch (err: any) {
        setSchemaData({ status: 'CRITICAL', message: err.message });
    } finally {
        setIsChecking(false);
    }
  };

  useEffect(() => {
    performLiveProof();
  }, []);

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">System Proof Center</h1>
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Real-time production visibility</p>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        {/* Environment Proof */}
        <Card className="border-none shadow-xl">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Key className="h-4 w-4" /> Active Production Keys
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Verified Variable Names:</p>
                <div className="space-y-2">
                    {envNames.length > 0 ? envNames.map(name => (
                        <div key={name} className="flex justify-between items-center p-2 rounded bg-green-50 border border-green-100">
                            <span className="font-mono text-[10px] text-green-700 font-bold">{name}</span>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </div>
                    )) : (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                            NO KEY NAMES DETECTED
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Schema Proof */}
        <Card className="border-none shadow-xl">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Table2 className="h-4 w-4" /> Schema Cache Diagnostic
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Live Result for 'public.profiles':</p>
                {isChecking ? <Loader2 className="animate-spin h-8 w-8 mx-auto opacity-20" /> : (
                    <div className="space-y-3">
                        {schemaData?.status === 'SUCCESS' ? (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <Badge className="bg-green-600 mb-2">VISIBLE</Badge>
                                <p className="text-xs font-mono">Row Count: {schemaData.count}</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-2">
                                <Badge variant="destructive">MISSING (PGRST205)</Badge>
                                <p className="text-[10px] font-mono leading-relaxed text-red-700">Error: {schemaData?.message}</p>
                            </div>
                        )}
                        <Button onClick={performLiveProof} variant="outline" className="w-full text-xs h-9">
                            <RefreshCcw className="h-3 w-3 mr-2" /> Re-Scan API Cache
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-dashed bg-muted/20">
        <CardHeader>
            <CardTitle className="text-sm font-black uppercase">Administrator's Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs font-medium uppercase tracking-tight leading-relaxed">
            <p>1. If **'Schema Cache Diagnostic'** shows MISSING, run this in Supabase SQL Editor:</p>
            <code className="block bg-zinc-950 text-green-400 p-4 rounded-xl font-mono text-[10px] whitespace-pre">
                NOTIFY pgrst, 'reload schema';
            </code>
            <Separator />
            <p>2. If **'Active Production Keys'** is empty, ensure your environment variables are named exactly as shown in Step 1.</p>
        </CardContent>
      </Card>
    </div>
  );
}
