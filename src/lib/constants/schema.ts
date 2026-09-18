/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * This is used by the Setup Admin recovery tool.
 * Updated to include the invoices table and JWT-based Master Admin bypass.
 */

export const DEFINITIVE_SQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor

-- 1. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 1000;

-- 2. TYPES
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.ledger_transaction_type AS ENUM ('payment', 'refund', 'adjustment', 'shipping_fee'); EXCEPTION WHEN duplicate_object THEN null; END $$;

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
    transaction_type public.ledger_transaction_type DEFAULT 'adjustment' NOT NULL,
    description text,
    transaction_date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'Unpaid' NOT NULL,
    invoice_number text UNIQUE,
    created_at timestamptz DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type text NOT NULL,
    description text,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN 
  IF EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN TRUE;
  END IF;
  IF (auth.jwt() ->> 'email') = 'admin@neilussolutions.com' THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC BALANCE SYNC
CREATE OR REPLACE FUNCTION public.sync_profile_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.profile_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance - OLD.amount WHERE id = OLD.profile_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance - OLD.amount + NEW.amount WHERE id = NEW.profile_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGERS
DROP TRIGGER IF EXISTS on_ledger_change ON public.financial_ledger;
CREATE TRIGGER on_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_balance();

-- 6. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial ledger access" ON public.financial_ledger FOR ALL USING (auth.uid() = profile_id OR is_admin());
CREATE POLICY "Invoices access" ON public.invoices FOR SELECT USING (auth.uid() = profile_id OR is_admin());
CREATE POLICY "Profiles access" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());

-- FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`;