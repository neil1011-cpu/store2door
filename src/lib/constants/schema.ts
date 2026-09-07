/**
 * @fileOverview Definitive Production SQL Schema for FromStore2Door OS.
 * This is used by the Setup Admin recovery tool.
 */

export const DEFINITIVE_SQL = `-- FROMSTORE2DOOR PRODUCTION SCHEMA
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
