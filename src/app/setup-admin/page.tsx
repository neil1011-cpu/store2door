'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Fingerprint, CheckCircle2, Database, Copy, Terminal, ExternalLink, RefreshCcw, Table2 } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

const INITIALIZATION_SQL = `-- 1. Create Roles Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  mailbox_number text UNIQUE,
  trn text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. App Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'customer' NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Financial Ledger
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  transaction_type text NOT NULL,
  source text,
  method text,
  description text,
  transaction_date timestamptz DEFAULT now(),
  legacy_firebase_id text UNIQUE
);

-- 5. Shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tracking_number text NOT NULL,
  contents text,
  weight_lbs numeric(10,2),
  status text DEFAULT 'Pending',
  total_cost_jmd numeric(12,2),
  payment_status text DEFAULT 'Unpaid',
  shipping_date timestamptz,
  internal_barcode text,
  legacy_firebase_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Pre-Alerts
CREATE TABLE IF NOT EXISTS public.pre_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tracking_number text NOT NULL,
  contents text,
  weight_lbs numeric(10,2),
  status text DEFAULT 'Pending',
  invoice_url text,
  submission_date timestamptz DEFAULT now(),
  legacy_firebase_id text UNIQUE
);

-- 7. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'Unpaid',
  invoice_url text,
  legacy_firebase_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 8. Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric(12,2) NOT NULL
);

-- 9. System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type text NOT NULL,
  description text,
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 10. System Configs
CREATE TABLE IF NOT EXISTS public.system_configs (
  config_key text PRIMARY KEY,
  config_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 11. Sent Emails
CREATE TABLE IF NOT EXISTS public.sent_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body_content text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now()
);

-- Authorizer Functions
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.manage_user_role(target_user_id uuid, new_role user_role)
RETURNS void AS $$
BEGIN
  IF NOT (SELECT public.is_admin()) AND auth.jwt()->>'email' != 'admin@neilussolutions.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.app_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR ALL USING (public.is_admin());`;

export default function SetupAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isCheckingSchema, setIsCheckingSchema] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<{ [key: string]: boolean }>({});
  const { supabase, user: currentUser } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@neilussolutions.com',
      password: '',
    },
  });

  const checkSchemaVisibility = async () => {
    setIsCheckingSchema(true);
    const tables = ['profiles', 'app_roles', 'shipments', 'invoices'];
    const results: { [key: string]: boolean } = {};
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      results[table] = !error || error.code !== 'PGRST205';
    }
    
    setSchemaStatus(results);
    setIsCheckingSchema(false);
    toast({ title: "Schema Visibility Check Complete" });
  };

  useEffect(() => {
    checkSchemaVisibility();
  }, [supabase]);

  const handleCopySql = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(INITIALIZATION_SQL);
        toast({ title: "SQL Copied", description: "Paste this into your Supabase SQL Editor." });
      } else {
        throw new Error('Clipboard access denied');
      }
    } catch (err) {
      toast({ title: "Manual Copy Required", description: "Please select the code and copy manually.", variant: "destructive" });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const response = await fetch('/api/admin/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Setup protocol failed.');
        toast({ title: 'Identity Secured', description: 'Admin account confirmed.' });
        router.push('/admin-login');
    } catch (error: any) {
        toast({ title: 'Setup Error', description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Diagnostic Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-xl">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Table2 className="h-4 w-4" /> API Schema Cache
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Live PostgREST Visibility</p>
                    <div className="space-y-2">
                        {Object.entries(schemaStatus).map(([table, visible]) => (
                            <div key={table} className="flex justify-between items-center p-2 rounded bg-muted/30">
                                <span className="font-mono text-xs">{table}</span>
                                <Badge variant={visible ? "default" : "destructive"} className="text-[8px]">
                                    {visible ? "VISIBLE" : "MISSING (PGRST205)"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                    <Button onClick={checkSchemaVisibility} disabled={isCheckingSchema} variant="outline" className="w-full text-xs h-9">
                        {isCheckingSchema ? <Loader2 className="animate-spin h-3 w-3" /> : <RefreshCcw className="h-3 w-3 mr-2" />}
                        Re-Scan Cache
                    </Button>

                    <Separator />
                    
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                        <p className="text-[9px] font-bold text-orange-800 uppercase flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" /> If tables show "MISSING"
                        </p>
                        <p className="text-[9px] text-orange-700 leading-relaxed">
                            Run the SQL script on the right. If they still show missing, run:
                            <code className="block bg-orange-100 p-1 mt-1 font-mono">NOTIFY pgrst, 'reload schema';</code>
                            in the Supabase SQL Editor.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Setup Column */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl overflow-hidden border-none">
                <CardHeader className="bg-primary/5 pb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">System Establishment</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Supabase Administrative Root</CardDescription>
                        </div>
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase opacity-60">Master Admin ID</FormLabel>
                                        <FormControl><Input {...field} className="h-11 border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase opacity-60">Access Key</FormLabel>
                                        <FormControl><Input type="password" {...field} className="h-11 border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase italic shadow-lg">
                                    {loading ? <Loader2 className="animate-spin" /> : "Authorize Root Identity"}
                                </Button>
                            </form>
                        </Form>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-zinc-950 rounded-xl p-4 border border-white/10 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-zinc-500">Database Schema SQL</span>
                                <Button variant="ghost" size="sm" onClick={handleCopySql} className="h-7 text-zinc-400">
                                    <Copy className="h-3 w-3 mr-2" /> Copy
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded bg-black/40 p-3">
                                <code className="text-[9px] font-mono text-green-400/70 block whitespace-pre">
                                    {INITIALIZATION_SQL}
                                </code>
                            </ScrollArea>
                        </div>
                        <div className="text-[10px] font-medium leading-relaxed opacity-60 flex gap-2">
                            <Terminal className="h-3 w-3 shrink-0" />
                            <span>Apply this script in the Supabase SQL Editor to resolve Table Not Found errors.</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
