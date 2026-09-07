'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Database, RefreshCcw, Table2, Key, CheckCircle2, Copy, Terminal, AlertTriangle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview System Proof & Recovery Center.
 * Displays literal production values and the REQUIRED SQL schema.
 */

export default function SetupAdminPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [isChecking, setIsChecking] = useState(false);
  const [envNames, setEnvNames] = useState<string[]>([]);
  const [dbProof, setDbProof] = useState<{ status: string; tables: string[]; error?: string } | null>(null);

  const definitiveSQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor

-- 1. TYPES & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.address_type AS ENUM ('pickup', 'delivery_destination'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    trn text,
    mailbox_number text UNIQUE,
    wallet_balance numeric(12,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_roles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role public.user_role DEFAULT 'customer' NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.pre_alerts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tracking_number text NOT NULL,
    contents text,
    weight_lbs numeric(10,2) DEFAULT 0,
    status text DEFAULT 'Pending' NOT NULL,
    invoice_url text,
    submission_date timestamptz DEFAULT now(),
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.shipments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tracking_number text UNIQUE NOT NULL,
    contents text,
    weight_lbs numeric(10,2) DEFAULT 0,
    status text DEFAULT 'Processed' NOT NULL,
    total_cost_jmd numeric(12,2) DEFAULT 0,
    payment_status text DEFAULT 'Unpaid' NOT NULL,
    shipping_date timestamptz,
    created_at timestamptz DEFAULT now(),
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_number text UNIQUE NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'Unpaid' NOT NULL,
    invoice_url text,
    created_at timestamptz DEFAULT now(),
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(12,2) NOT NULL,
    transaction_type text NOT NULL,
    source text,
    method text,
    description text,
    transaction_date timestamptz DEFAULT now(),
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type text NOT NULL,
    description text,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. FUNCTIONS & SECURITY
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'admin'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by owner or admin" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());

-- FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`;

  const performLiveProof = async () => {
    setIsChecking(true);
    try {
        // 1. Detect keys
        const names = [];
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) names.push('NEXT_PUBLIC_SUPABASE_URL');
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) names.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        setEnvNames(names);

        // 2. Fetch table list from diagnostic endpoint
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

  const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(definitiveSQL);
        toast({ title: "SQL Copied", description: "Paste this into the Supabase SQL Editor." });
    } catch (err) {
        toast({ title: "Copy Failed", description: "Please manually select and copy the code below.", variant: "destructive" });
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="border-none shadow-xl">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Key className="h-4 w-4" /> Environment Integrity
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Browser-Accessible Keys:</p>
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

        <Card className="border-none shadow-xl">
            <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Database className="h-4 w-4" /> Schema Registry Proof
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
                <CardTitle className="text-xl font-black italic uppercase italic tracking-tighter">Master Schema Deployment</CardTitle>
                <CardDescription className="text-zinc-500 font-bold uppercase text-[10px]">Required SQL for Project: otvxtkphevaliijqircs</CardDescription>
            </div>
            <Button onClick={copyToClipboard} size="sm" variant="secondary" className="font-black uppercase text-[10px]">
                <Copy className="h-3 w-3 mr-2" /> Copy SQL
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full bg-zinc-900 p-6">
                <pre className="text-[11px] font-mono text-green-400 whitespace-pre leading-relaxed">
                    {definitiveSQL}
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
