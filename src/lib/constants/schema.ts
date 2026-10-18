/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * Hardened version with binary documentation storage, immutable ledger logic, and granular RLS.
 * Includes Real-time publication for live UI updates.
 */

export const DEFINITIVE_SQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA (HARDENED v5.1)
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
    logicware_id text UNIQUE,
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

CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    address_line_1 text NOT NULL,
    address_line_2 text,
    city text NOT NULL,
    state_parish text NOT NULL,
    zip_code text,
    address_type text DEFAULT 'delivery' NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    file_data bytea NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
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

CREATE TABLE IF NOT EXISTS public.manifests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    flight_number text NOT NULL,
    manifest_date date NOT NULL,
    carrier text,
    origin text DEFAULT 'Florida',
    destination text DEFAULT 'Jamaica',
    status text DEFAULT 'Scheduled',
    manifest_type text DEFAULT 'Air',
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
    logicware_id text UNIQUE,
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
    invoice_url text,
    logicware_id text UNIQUE,
    manifest_id uuid REFERENCES public.manifests(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    legacy_firebase_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.system_configs (
    config_key text PRIMARY KEY,
    config_value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES public.profiles(id)
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

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_ledger_profile ON public.financial_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_profile ON public.invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_pre_alerts_profile ON public.pre_alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_shipments_profile ON public.shipments(profile_id);
CREATE INDEX IF NOT EXISTS idx_roles_user ON public.app_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_assets_profile ON public.document_assets(profile_id);

-- 6. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN 
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR (auth.jwt() ->> 'email' = 'admin@neilussolutions.com'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION public.assign_mailbox_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.mailbox_number IS NULL THEN
    NEW.mailbox_number := 'FSTD' || nextval('public.mailbox_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_ledger_change ON public.financial_ledger;
CREATE TRIGGER on_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_balance();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_mailbox_number();

-- 7. RLS ENABLING
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "pre_alerts_select" ON public.pre_alerts;
CREATE POLICY "pre_alerts_select" ON public.pre_alerts FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "pre_alerts_insert" ON public.pre_alerts;
CREATE POLICY "pre_alerts_insert" ON public.pre_alerts FOR INSERT WITH CHECK (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "pre_alerts_update" ON public.pre_alerts;
CREATE POLICY "pre_alerts_update" ON public.pre_alerts FOR UPDATE USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "shipments_select" ON public.shipments;
CREATE POLICY "shipments_select" ON public.shipments FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "shipments_admin" ON public.shipments;
CREATE POLICY "shipments_admin" ON public.shipments FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "invoices_admin" ON public.invoices;
CREATE POLICY "invoices_admin" ON public.invoices FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "ledger_select" ON public.financial_ledger;
CREATE POLICY "ledger_select" ON public.financial_ledger FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "ledger_insert_admin" ON public.financial_ledger;
CREATE POLICY "ledger_insert_admin" ON public.financial_ledger FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "addresses_select" ON public.addresses;
CREATE POLICY "addresses_select" ON public.addresses FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "addresses_owner" ON public.addresses;
CREATE POLICY "addresses_owner" ON public.addresses FOR ALL USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "doc_assets_select" ON public.document_assets;
CREATE POLICY "doc_assets_select" ON public.document_assets FOR SELECT USING (auth.uid() = profile_id OR is_admin());
DROP POLICY IF EXISTS "doc_assets_insert" ON public.document_assets;
CREATE POLICY "doc_assets_insert" ON public.document_assets FOR INSERT WITH CHECK (auth.uid() = profile_id OR is_admin());

-- 9. REAL-TIME PUBLICATIONS
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.pre_alerts, 
    public.shipments, 
    public.profiles, 
    public.financial_ledger,
    public.system_logs;

NOTIFY pgrst, 'reload schema';`