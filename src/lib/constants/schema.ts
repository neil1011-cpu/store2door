/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * This is used by the Setup Admin recovery tool.
 * Updated to include the missing Financial Ledger table and Atomic Profile Generation.
 */

export const DEFINITIVE_SQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor

-- 1. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 1000;

-- 2. TYPES
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES
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

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    transaction_date timestamptz DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.system_configs (
    config_key text PRIMARY KEY,
    config_value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sent_emails (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_email text NOT NULL,
    recipient_name text,
    subject text,
    body_content text,
    status text,
    sent_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type text NOT NULL,
    description text,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    address_line_1 text NOT NULL,
    address_line_2 text,
    city text NOT NULL,
    state_parish text NOT NULL,
    zip_code text,
    address_type text DEFAULT 'delivery' NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(profile_id, address_type)
);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN 
  RETURN EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'admin'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC PROFILE TRIGGER (Ensures idempotency)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mailbox_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    'FSTD' || nextval('public.mailbox_seq')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner or admin" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own roles" ON public.app_roles;
CREATE POLICY "Users can view their own roles" 
ON public.app_roles FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own ledger" ON public.financial_ledger;
CREATE POLICY "Users can view their own ledger" 
ON public.financial_ledger FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own alerts" ON public.pre_alerts;
CREATE POLICY "Users can view their own alerts" 
ON public.pre_alerts FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
CREATE POLICY "Users can view their own shipments" 
ON public.shipments FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

-- FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`;
```
  </change>
  <change>
    <file>src/app/account/layout.tsx</file>
    <content><![CDATA['use client';

import { useEffect, type ReactNode, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { createContext, useContext } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Separator } from '@/components/ui/separator';
import { Wallet, Menu, TrendingDown, Loader2, LogOut, AlertTriangle, RefreshCcw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const UserProfileContext = createContext<{ profile: UserProfile | null; balance: number }>({ profile: null, balance: 0 });
export const useAccountProfile = () => useContext(UserProfileContext);

const accountNavLinks = [
    { href: '/account', label: 'Dashboard' },
    { href: '/account/pre-alert', label: 'Pre-Alert' },
    { href: '/account/packages', label: 'Packages' },
    { href: '/account/profile', label: 'Profile' },
    { href: '/account/support', label: 'Support' },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
    const { supabase, user, isLoading: isAuthLoading } = useSupabase();
    const router = useRouter();
    const pathname = usePathname();
    
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [balance, setBalance] = useState(0);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsDataLoading(true);
        setError(null);
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            
            if (profileError) throw profileError;
            
            if (profileData) {
                setProfile(profileData);

                // Fetch Balance from the ledger (Table now strictly defined in schema)
                const { data: ledgerData, error: ledgerError } = await supabase
                    .from('financial_ledger')
                    .select('amount')
                    .eq('profile_id', user.id);
                
                if (!ledgerError) {
                    const totalBalance = ledgerData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
                    setBalance(totalBalance);
                }
                
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                    retryTimerRef.current = null;
                }
            } else {
                if (retryCount < 12) { // 24 seconds of total polling
                    retryTimerRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, 2000);
                } else {
                    setError("Identity sync timed out. Please check if your account was created correctly in the registry.");
                }
            }
        } catch (error: any) {
            console.error('Account Fetch Error:', error);
            setError(error.message);
        } finally {
            setIsDataLoading(false);
        }
    }, [user, supabase, retryCount]);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/signin');
        }
    }, [user, isAuthLoading, router]);

    useEffect(() => {
        if (user) fetchData();
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [fetchData, user]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/signin');
    };

    // LOADING: Auth is working but we haven't checked for profile yet
    if (isAuthLoading || (user && isDataLoading && !profile && retryCount === 0)) {
        return (
            <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Establishing Uplink</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Syncing with worldwide registry...</p>
            </div>
        );
    }

    // ERROR: Database or Sync failed
    if (error) {
        return (
            <div className="container mx-auto py-24 px-4 flex items-center justify-center min-h-[80vh]">
                <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
                    <CardContent className="pt-10 pb-10 text-center space-y-6">
                        <div className="bg-destructive/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Registry Failure</h2>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed">{error}</p>
                        </div>
                        <Button onClick={() => window.location.reload()} className="w-full h-12 font-black uppercase italic">Retry Connection</Button>
                        <Button variant="ghost" onClick={handleSignOut} className="w-full text-xs font-bold uppercase opacity-60">Sign Out</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // PROVISIONING: User logged in, but Profile row hasn't arrived in Postgres yet
    if (user && !profile) {
        return (
            <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[80vh] text-center">
                <div className="bg-primary/10 p-8 rounded-full mb-8">
                    <RefreshCcw className="h-12 w-12 text-primary animate-spin" />
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Finalizing Identity</h1>
                <p className="text-muted-foreground max-w-sm mb-10 text-sm font-medium uppercase tracking-widest leading-relaxed">
                    We are establishing your global mailbox in our registry. This takes a few seconds.
                </p>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Awaiting Postgres Confirmation (Attempt {retryCount}/12)
                    </div>
                    <Button variant="ghost" onClick={handleSignOut} className="text-xs font-bold uppercase opacity-60">
                        Sign Out & Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!user || !profile) return null;

    const isSecurityPage = pathname === '/account/change-password';
    const isIndebted = balance < 0;

    return (
        <UserProfileContext.Provider value={{ profile, balance }}>
            <div className="min-h-screen bg-muted/20">
                <div className="bg-background border-b shadow-sm sticky top-0 z-40 print:hidden">
                    <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            {!isSecurityPage && (
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="md:hidden">
                                            <Menu className="h-5 w-5" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-[300px]">
                                        <SheetHeader className="mb-8">
                                            <SheetTitle><AppLogo onClick={() => setIsMobileMenuOpen(false)} /></SheetTitle>
                                        </SheetHeader>
                                        <nav className="flex flex-col gap-2">
                                            {accountNavLinks.map(link => (
                                                <Link 
                                                    key={link.href}
                                                    href={link.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cn(
                                                        "text-base font-bold uppercase tracking-wider p-4 rounded-lg transition-colors",
                                                        pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                                    )}
                                                >
                                                    {link.label}
                                                </Link>
                                            ))}
                                            <Separator className="my-4" />
                                            <Button onClick={handleSignOut} variant="destructive" className="w-full h-12 font-black uppercase italic mt-4">
                                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                            </Button>
                                        </nav>
                                    </SheetContent>
                                </Sheet>
                            )}
                            <AppLogo className="scale-75 sm:scale-90" />
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-hidden">
                            {!isSecurityPage && (
                                <div className={cn(
                                    "border-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner max-w-[200px] sm:max-w-none transition-colors",
                                    isIndebted ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/10"
                                )}>
                                    {isIndebted ? <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" /> : <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                                            {isIndebted ? 'Outstanding' : 'Credit'}
                                        </span>
                                        <span className={cn(
                                            "text-xs sm:text-sm font-black italic tracking-tighter leading-tight truncate",
                                            isIndebted ? "text-red-600" : "text-foreground"
                                        )}>
                                            JMD ${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="shrink-0"><ThemeToggle /></div>
                            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden sm:flex text-muted-foreground hover:text-destructive">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="py-4 sm:py-8">
                    {children}
                </div>
            </div>
        </UserProfileContext.Provider>
    );
}