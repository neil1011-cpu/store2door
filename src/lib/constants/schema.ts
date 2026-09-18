/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * Hardened version with immutable ledger logic, corrected triggers, and granular RLS.
 * Made fully idempotent for safe re-runs.
 */

export const DEFINITIVE_SQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA (HARDENED v3.2)
-- Run this in your Supabase SQL Editor

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & TYPES
DO $$ BEGIN 
    CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin'); 
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN 
    CREATE TYPE public.ledger_transaction_type AS ENUM ('payment', 'refund', 'adjustment', 'shipping_fee');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 1000;

-- 4. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    trn text CHECK (trn ~ '^[0-9]{9}$'),
    mailbox_number text UNIQUE,
    wallet_balance numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role public.user_role DEFAULT 'customer' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount <> 0),
    transaction_type public.ledger_transaction_type DEFAULT 'adjustment' NOT NULL,
    description text,
    reference_id uuid,
    created_by uuid REFERENCES public.profiles(id),
    transaction_date timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    status text DEFAULT 'Unpaid' NOT NULL CHECK (status IN ('Paid', 'Unpaid', 'Void')),
    invoice_number text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pre_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tracking_number text NOT NULL,
    contents text,
    weight_lbs numeric(10,2) DEFAULT 0 CHECK (weight_lbs >= 0),
    status text DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Processed', 'Cancelled')),
    invoice_url text,
    submission_date timestamptz DEFAULT now() NOT NULL,
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.shipments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tracking_number text UNIQUE NOT NULL,
    contents text,
    weight_lbs numeric(10,2) DEFAULT 0 CHECK (weight_lbs >= 0),
    status text DEFAULT 'Processed' NOT NULL,
    total_cost_jmd numeric(12,2) DEFAULT 0 CHECK (total_cost_jmd >= 0),
    payment_status text DEFAULT 'Unpaid' NOT NULL CHECK (payment_status IN ('Paid', 'Unpaid', 'Partial')),
    shipping_date timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.system_configs (
    config_key text PRIMARY KEY,
    config_value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sent_emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email text NOT NULL,
    recipient_name text,
    subject text,
    body_content text,
    status text CHECK (status IN ('sent', 'simulated', 'failed')),
    sent_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    log_type text NOT NULL,
    description text,
    actor_id uuid REFERENCES public.profiles(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    address_line_1 text NOT NULL,
    address_line_2 text,
    city text NOT NULL,
    state_parish text NOT NULL,
    zip_code text,
    address_type text DEFAULT 'delivery' NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(profile_id, address_type)
);

-- 5. INDEXES (Performance & RLS)
CREATE INDEX IF NOT EXISTS idx_ledger_profile ON public.financial_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_profile ON public.invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_pre_alerts_profile ON public.pre_alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_shipments_profile ON public.shipments(profile_id);
CREATE INDEX IF NOT EXISTS idx_roles_user ON public.app_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_profile ON public.addresses(profile_id);

-- 6. FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN 
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR (auth.jwt() ->> 'email' = 'admin@neilussolutions.com'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURE SYNC TRIGGER (Handles Profile Switches correctly)
CREATE OR REPLACE FUNCTION public.sync_profile_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.profile_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance - OLD.amount WHERE id = OLD.profile_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.profile_id <> NEW.profile_id THEN
      UPDATE public.profiles SET wallet_balance = wallet_balance - OLD.amount WHERE id = OLD.profile_id;
      UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.profile_id;
    ELSE
      UPDATE public.profiles SET wallet_balance = wallet_balance - OLD.amount + NEW.amount WHERE id = NEW.profile_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AUTOMATED MAILBOX TRIGGER
CREATE OR REPLACE FUNCTION public.assign_mailbox_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.mailbox_number IS NULL THEN
    NEW.mailbox_number := 'FSTD' || nextval('public.mailbox_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGERS (Idempotent: Drop before Create)
DROP TRIGGER IF EXISTS on_ledger_change ON public.financial_ledger;
CREATE TRIGGER on_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_balance();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_mailbox_number();

-- 8. RLS ENABLING
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 9. POLICIES (Idempotent: Drop before Create)

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Ledger (APPEND ONLY for Admin, READ ONLY for User)
DROP POLICY IF EXISTS "ledger_select" ON public.financial_ledger;
CREATE POLICY "ledger_select" ON public.financial_ledger FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "ledger_insert_admin" ON public.financial_ledger;
CREATE POLICY "ledger_insert_admin" ON public.financial_ledger FOR INSERT WITH CHECK (is_admin());

-- Invoices
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "invoices_admin" ON public.invoices;
CREATE POLICY "invoices_admin" ON public.invoices FOR ALL USING (is_admin());

-- Pre-alerts
DROP POLICY IF EXISTS "pre_alerts_select" ON public.pre_alerts;
CREATE POLICY "pre_alerts_select" ON public.pre_alerts FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "pre_alerts_insert" ON public.pre_alerts;
CREATE POLICY "pre_alerts_insert" ON public.pre_alerts FOR INSERT WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "pre_alerts_admin" ON public.pre_alerts;
CREATE POLICY "pre_alerts_admin" ON public.pre_alerts FOR UPDATE USING (is_admin());

-- Shipments
DROP POLICY IF EXISTS "shipments_select" ON public.shipments;
CREATE POLICY "shipments_select" ON public.shipments FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "shipments_admin" ON public.shipments;
CREATE POLICY "shipments_admin" ON public.shipments FOR ALL USING (is_admin());

-- Internal Audit
DROP POLICY IF EXISTS "logs_select_admin" ON public.system_logs;
CREATE POLICY "logs_select_admin" ON public.system_logs FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "emails_select_admin" ON public.sent_emails;
CREATE POLICY "emails_select_admin" ON public.sent_emails FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "configs_select_admin" ON public.system_configs;
CREATE POLICY "configs_select_admin" ON public.system_configs FOR SELECT USING (is_admin());

-- 10. BACKFILL (Idempotent)
DO $$ 
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'New User'), u.email
    FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.app_roles (user_id, role)
    SELECT u.id, 'customer'::public.user_role
    FROM auth.users u LEFT JOIN public.app_roles r ON u.id = r.user_id WHERE r.user_id IS NULL
    ON CONFLICT DO NOTHING;
END $$;

-- FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`