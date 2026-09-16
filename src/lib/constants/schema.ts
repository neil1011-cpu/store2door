/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * This is used by the Setup Admin recovery tool.
 * Updated to include Master Admin RLS bypass and hardened identity functions.
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
-- Updated with Master Admin Bypass for RLS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
DECLARE
  caller_email text;
BEGIN 
  -- 1. Check explicit role table
  IF EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN TRUE;
  END IF;

  -- 2. Check hardcoded master admin email bypass
  caller_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF caller_email = 'admin@neilussolutions.com' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ATOMIC BALANCE SYNC (Keeps profile column matched to ledger sum)
CREATE OR REPLACE FUNCTION public.sync_profile_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.profile_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - OLD.amount
    WHERE id = OLD.profile_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - OLD.amount + NEW.amount
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP TRIGGER IF EXISTS on_ledger_change ON public.financial_ledger;
CREATE TRIGGER on_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_balance();

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

DROP POLICY IF EXISTS "Profiles are updatable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are updatable by owner or admin" 
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own roles" ON public.app_roles;
CREATE POLICY "Users can view their own roles" 
ON public.app_roles FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own ledger" ON public.financial_ledger;
CREATE POLICY "Users can view their own ledger" 
ON public.financial_ledger FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Admins can insert into ledger" ON public.financial_ledger;
CREATE POLICY "Admins can insert into ledger" 
ON public.financial_ledger FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can view their own alerts" ON public.pre_alerts;
CREATE POLICY "Users can view their own alerts" 
ON public.pre_alerts FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
CREATE POLICY "Users can view their own shipments" 
ON public.shipments FOR SELECT 
USING (auth.uid() = profile_id OR is_admin());

-- 7. IDEMPOTENT BACKFILL (Run this to sync existing Auth users)
INSERT INTO public.profiles (id, full_name, email, mailbox_number)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Legacy User'), email, 'FSTD' || nextval('public.mailbox_seq')
FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.app_roles (user_id, role)
SELECT id, 'customer'::public.user_role
FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.app_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;

-- FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`;