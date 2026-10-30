'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, RefreshCcw, Key, CheckCircle2, Copy, Terminal, AlertTriangle, UserPlus, ShieldCheck } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DEFINITIVE_SQL } from '@/lib/constants/schema';

/**
 * @fileOverview System Proof & Recovery Center.
 * Facilitates master admin identity establishment and schema verification.
 */

export default function SetupAdminPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [isChecking, setIsChecking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [envNames, setEnvNames] = useState<string[]>([]);
  const [dbProof, setDbProof] = useState<{ status: string; tables: string[]; error?: string } | null>(null);

  const performLiveProof = async () => {
    setIsChecking(true);
    try {
        const names = [];
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) names.push('NEXT_PUBLIC_SUPABASE_URL');
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) names.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        setEnvNames(names);

        const res = await fetch('/api/admin/db-proof');
        const data = await res.json();
        setDbProof(data);

        if (data.status === 'SUCCESS') {
            toast({ title: "Database Verified", description: `${data.tables.length} tables detected.` });
        } else {
            toast({ title: "Schema Error", description: data.error || "Empty schema detected.", variant: "destructive" });
        }
    } catch (err: any) {
        setDbProof({ status: 'CRITICAL', tables: [], error: err.message });
    } finally {
        setIsChecking(false);
    }
  };

  const handleInitializeAdmin = async () => {
    if (!recoveryPassword || recoveryPassword.length < 8) {
      toast({ title: "Validation Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsInitializing(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@neilussolutions.com', password: recoveryPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Setup failed.');

      toast({ title: "Identity Established", description: "Admin account is now active. You may log in." });
      setRecoveryPassword('');
    } catch (err: any) {
      toast({ title: "Initialization Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsInitializing(true);
    }
  };

  const copyToClipboard = async () => {
    try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(DEFINITIVE_SQL);
        toast({ title: "SQL Copied", description: "Paste this into the Supabase SQL Editor." });
    } catch (err) {
        console.warn("[CLIPBOARD] Falling back to manual selection.", err);
        toast({ title: "Manual Copy Required", description: "Please manually select and copy the SQL code below.", variant: "default" });
    }
  };

  useEffect(() => {
    performLiveProof();
  }, []);

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">System Proof Center</h1>
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Production Identity & Schema Audit</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="border-none shadow-xl col-span-1">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Admin Recovery
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Establish or reset master admin account.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Master Email Identifier</Label>
                    <Input value="admin@neilussolutions.com" readOnly className="bg-muted font-bold text-xs" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Recovery Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Min 8 characters" 
                      value={recoveryPassword} 
                      onChange={e => setRecoveryPassword(e.target.value)} 
                      className="border-2"
                    />
                </div>
                <Button onClick={handleInitializeAdmin} disabled={isInitializing} className="w-full font-black uppercase italic shadow-lg">
                    {isInitializing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Initialize Master Admin
                </Button>
            </CardContent>
        </Card>

        <Card className="border-none shadow-xl col-span-1">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Key className="h-4 w-4" /> Environment Integrity
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Keys Check:</p>
                <div className="space-y-2">
                    {envNames.length > 0 ? envNames.map(name => (
                        <div key={name} className="flex justify-between items-center p-2 rounded bg-green-50 border border-green-100">
                            <span className="font-mono text-[10px] text-green-700 font-bold">{name}</span>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </div>
                    )) : (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> NO KEYS DETECTED
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card className="border-none shadow-xl col-span-1">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Database className="h-4 w-4" /> Schema Registry
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Detected 'public' Tables:</p>
                {isChecking ? <Loader2 className="animate-spin h-8 w-8 mx-auto opacity-20" /> : (
                    <div className="space-y-3">
                        {dbProof?.status === 'SUCCESS' && dbProof.tables.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {dbProof.tables.map(t => (
                                    <Badge key={t} className="bg-green-600 uppercase text-[9px]">{t}</Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-2">
                                <Badge variant="destructive">EMPTY SCHEMA</Badge>
                                <p className="text-[10px] font-mono leading-relaxed text-red-700">Result: 0 tables found in schema 'public'.</p>
                            </div>
                        )}
                        <Button onClick={performLiveProof} variant="outline" className="w-full text-xs h-10 font-bold">
                            <RefreshCcw className="h-3 w-3 mr-2" /> Re-Scan Database
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <Card className="border-4 border-primary/20 shadow-2xl overflow-hidden">
        <CardHeader className="bg-zinc-950 text-white flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Master Schema Deployment</CardTitle>
                <CardDescription className="text-zinc-500 font-bold uppercase text-[10px]">Official Registry Structure (v3.2)</CardDescription>
            </div>
            <Button onClick={copyToClipboard} size="sm" variant="secondary" className="font-black uppercase text-[10px]">
                <Copy className="h-3 w-3 mr-2" /> Copy SQL
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full bg-zinc-900 p-6">
                <pre className="text-[11px] font-mono text-green-400 whitespace-pre leading-relaxed">
                    {DEFINITIVE_SQL}
                </pre>
            </ScrollArea>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t p-6">
            <div className="flex items-start gap-4">
                <Terminal className="h-6 w-6 text-primary shrink-0" />
                <p className="text-[11px] font-medium uppercase leading-relaxed">
                    <strong>Instructions:</strong> Paste the code above into the <strong>SQL Editor</strong> in your Supabase Dashboard and click <strong>Run</strong>. This will create all tables, set up the <code>is_admin()</code> function, and enable Row Level Security.
                </p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
