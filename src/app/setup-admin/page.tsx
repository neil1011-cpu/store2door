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
import { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Fingerprint, CheckCircle2, Database, Copy, Terminal, ExternalLink } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [isElevatingSession, setIsElevatingSession] = useState(false);
  const { supabase, user: currentUser } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@neilussolutions.com',
      password: '',
    },
  });

  const handleCopySql = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(INITIALIZATION_SQL);
        toast({ title: "SQL Copied", description: "Paste this into your Supabase SQL Editor." });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      console.warn("Clipboard access failed:", err);
      toast({ 
        title: "Manual Copy Required", 
        description: "Please select the code and copy it manually (Ctrl+C).", 
        variant: "destructive" 
      });
    }
  }

  const handleElevateCurrentSession = async () => {
      if (!currentUser) {
          toast({ title: 'No Session Found', description: 'Please sign in first.', variant: 'destructive' });
          return;
      }
      setIsElevatingSession(true);
      try {
          const { error } = await supabase.rpc('manage_user_role', { 
            target_user_id: currentUser.id, 
            new_role: 'admin' 
          });

          if (error) throw error;

          toast({ title: 'Privileges Granted!', description: 'Your administrator identity has been synchronized.' });
          
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
      } catch (error: any) {
          console.error("Elevation error:", error);
          toast({ title: 'Setup Failed', description: error.message, variant: "destructive" });
      } finally {
          setIsElevatingSession(false);
      }
  }

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

        toast({
            title: 'Identity Secured',
            description: 'Master Admin account created and confirmed successfully.',
        });
        
        setTimeout(() => {
            router.push('/admin-login');
        }, 2000);

    } catch (error: any) {
        toast({
            title: 'Setup Error',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            <Card className="shadow-xl overflow-hidden border-none">
                <CardHeader className="text-center bg-primary/5 pb-8">
                <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="text-3xl mt-4 font-black italic uppercase tracking-tighter">Admin Recovery Hub</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                    Establish Supabase Master Admin
                </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="font-bold uppercase text-xs">Administrative Protocol</AlertTitle>
                        <AlertDescription className="text-[10px] uppercase leading-relaxed mt-1">
                            This terminal will auto-confirm your master email and grant full database access.
                        </AlertDescription>
                    </Alert>

                {currentUser ? (
                    <div className="space-y-4 mb-8">
                        <div className="p-4 border-2 border-dashed rounded-xl bg-muted/30 flex items-center gap-4">
                            <Fingerprint className="h-8 w-8 text-primary" />
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Session</p>
                                <p className="font-bold truncate text-sm">{currentUser.email}</p>
                            </div>
                        </div>
                        <Button onClick={handleElevateCurrentSession} disabled={isElevatingSession} className="w-full h-14 font-black uppercase italic shadow-lg" variant="secondary">
                            {isElevatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Elevate Current Account
                        </Button>
                        <div className="relative py-4">
                            <Separator />
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-[10px] uppercase font-bold text-muted-foreground">OR CONFIGURE MASTER</span>
                        </div>
                    </div>
                ) : null}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase opacity-60">Master Admin ID</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="admin@neilussolutions.com" {...field} className="h-12 border-2" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase opacity-60">Secure Key</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="h-12 border-2" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authorizing...</> : 'Bypass Verification & Initialize'}
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="shadow-xl border-orange-200">
                <CardHeader className="bg-orange-50/50">
                    <div className="flex items-center gap-3">
                        <Database className="h-6 w-6 text-orange-600" />
                        <CardTitle className="text-xl font-black italic uppercase italic">Database Schema Required</CardTitle>
                    </div>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                        Fix "Table Not Found" errors by initializing your schema
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <p className="text-xs font-medium leading-relaxed opacity-70">
                        If you are seeing a <strong>"Could not find the table 'public.profiles'"</strong> error, your Supabase project is missing its core structure.
                    </p>
                    
                    <div className="p-4 bg-zinc-950 rounded-xl space-y-4 border border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Logistics OS Script</span>
                            <Button variant="ghost" size="sm" onClick={handleCopySql} className="h-8 text-zinc-400 hover:text-white">
                                <Copy className="h-3 w-3 mr-2" /> Copy SQL
                            </Button>
                        </div>
                        <ScrollArea className="h-[200px] w-full rounded-md bg-black/40 p-4">
                            <code className="text-[10px] font-mono text-green-400/80 leading-tight block whitespace-pre">
                                {INITIALIZATION_SQL}
                            </code>
                        </ScrollArea>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="h-3 w-3" /> How to Apply:
                        </h4>
                        <ol className="text-[11px] font-bold uppercase tracking-tight space-y-2 opacity-80 list-decimal pl-4">
                            <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" className="text-primary underline flex-inline items-center gap-1">Supabase Dashboard <ExternalLink className="h-2 w-2 inline" /></a></li>
                            <li>Select <strong>"SQL Editor"</strong> from the sidebar</li>
                            <li>Click <strong>"New Query"</strong></li>
                            <li>Paste the code above and click <strong>"Run"</strong></li>
                        </ol>
                    </div>

                    <Alert variant="destructive" className="border-2">
                        <ShieldCheck className="h-4 w-4" />
                        <AlertTitle className="text-xs font-black uppercase tracking-widest">Master Identity Required</AlertTitle>
                        <AlertDescription className="text-[10px] font-medium leading-relaxed uppercase mt-1">
                            Ensure the email in the SQL script (admin@neilussolutions.com) matches the one you use in the form on the left.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
