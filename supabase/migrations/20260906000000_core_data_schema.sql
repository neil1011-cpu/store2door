-- Core Data Schema Migration
-- Target Project: FromStore2Door Global Logistics
-- Timestamp: 20260906000000

/**
 * @fileOverview Hardened relational schema design for the Store2Door logistics platform.
 * Implements granular staff authorization and historical record protection.
 */

-- 1. Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text, 
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state_parish text NOT NULL,
  zip_code text,
  country text DEFAULT 'Jamaica',
  is_default boolean DEFAULT false,
  address_type text CHECK (address_type IN ('shipping_origin', 'delivery_destination')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Pickup Personnel
CREATE TABLE IF NOT EXISTS public.pickup_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  government_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  legacy_firebase_id text
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, -- PROTECTED: Historical Accounting
  invoice_number text UNIQUE NOT NULL, 
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('Paid', 'Unpaid', 'Cancelled')),
  invoice_url text, 
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  legacy_firebase_id text
);

-- 4. Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 5. Shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, -- PROTECTED: Historical Logistics
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  tracking_number text UNIQUE NOT NULL,
  contents text,
  weight_lbs numeric(10,2),
  total_cost_jmd numeric(12,2) DEFAULT 0,
  status text NOT NULL, 
  payment_status text DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid', 'Partial')),
  shipping_date timestamptz,
  logicware_id text, 
  internal_barcode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  legacy_firebase_id text
);

-- 6. Shipment Tracking Events
CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  description text,
  event_timestamp timestamptz DEFAULT now(),
  actor_id uuid REFERENCES public.profiles(id), 
  created_at timestamptz DEFAULT now()
);

-- 7. Pre-Alerts
CREATE TABLE IF NOT EXISTS public.pre_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, -- PROTECTED: Historical Audit
  tracking_number text NOT NULL,
  contents text,
  weight_lbs numeric(10,2),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processed', 'Cancelled')),
  invoice_url text, 
  submission_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  legacy_firebase_id text
);

-- 8. Financial Ledger (Immutable)
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL, 
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'adjustment', 'shipping_fee')),
  method text, 
  source text, 
  description text,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  legacy_firebase_id text
);

-- 9. System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL,
  description text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 10. Sent Emails
CREATE TABLE IF NOT EXISTS public.sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body_content text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 11. System Configuration
CREATE TABLE IF NOT EXISTS public.system_configs (
  config_key text PRIMARY KEY,
  config_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 12. ROW LEVEL SECURITY POLICIES

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Addresses
DROP POLICY IF EXISTS "Profiles view own addresses" ON public.addresses;
CREATE POLICY "Profiles view own addresses" ON public.addresses FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Profiles manage own addresses" ON public.addresses;
CREATE POLICY "Profiles manage own addresses" ON public.addresses FOR ALL 
  USING (auth.uid() = profile_id);

-- Pickup Personnel
DROP POLICY IF EXISTS "Profiles view own pickup personnel" ON public.pickup_personnel;
CREATE POLICY "Profiles view own pickup personnel" ON public.pickup_personnel FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Profiles manage own pickup personnel" ON public.pickup_personnel;
CREATE POLICY "Profiles manage own pickup personnel" ON public.pickup_personnel FOR ALL 
  USING (auth.uid() = profile_id);

-- Invoices
DROP POLICY IF EXISTS "Profiles view own invoices" ON public.invoices;
CREATE POLICY "Profiles view own invoices" ON public.invoices FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Operational staff can create and update invoices" ON public.invoices;
CREATE POLICY "Operational staff can create and update invoices" ON public.invoices FOR INSERT
  WITH CHECK (public.is_admin() OR public.has_role('staff'));

CREATE POLICY "Operational staff can update invoices" ON public.invoices FOR UPDATE
  USING (public.is_admin() OR public.has_role('staff'));

-- Invoice Line Items
DROP POLICY IF EXISTS "Profiles view own line items" ON public.invoice_line_items;
CREATE POLICY "Profiles view own line items" ON public.invoice_line_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND (profile_id = auth.uid() OR public.is_admin() OR public.has_role('staff'))));

DROP POLICY IF EXISTS "Operational staff can manage line items" ON public.invoice_line_items;
CREATE POLICY "Operational staff can manage line items" ON public.invoice_line_items FOR INSERT
  WITH CHECK (public.is_admin() OR public.has_role('staff'));

CREATE POLICY "Operational staff can update line items" ON public.invoice_line_items FOR UPDATE
  USING (public.is_admin() OR public.has_role('staff'));

-- Shipments
DROP POLICY IF EXISTS "Profiles view own shipments" ON public.shipments;
CREATE POLICY "Profiles view own shipments" ON public.shipments FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Operational staff can manage shipments" ON public.shipments;
CREATE POLICY "Operational staff can manage shipments" ON public.shipments FOR INSERT
  WITH CHECK (public.is_admin() OR public.has_role('staff'));

CREATE POLICY "Operational staff can update shipments" ON public.shipments FOR UPDATE
  USING (public.is_admin() OR public.has_role('staff'));

-- Shipment Tracking Events
DROP POLICY IF EXISTS "Profiles view own tracking events" ON public.shipment_tracking_events;
CREATE POLICY "Profiles view own tracking events" ON public.shipment_tracking_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE id = shipment_id AND (profile_id = auth.uid() OR public.is_admin() OR public.has_role('staff'))));

DROP POLICY IF EXISTS "Operational staff can manage tracking events" ON public.shipment_tracking_events;
CREATE POLICY "Operational staff can manage tracking events" ON public.shipment_tracking_events FOR INSERT
  WITH CHECK (public.is_admin() OR public.has_role('staff'));

-- Pre-Alerts
DROP POLICY IF EXISTS "Profiles view own pre_alerts" ON public.pre_alerts;
CREATE POLICY "Profiles view own pre_alerts" ON public.pre_alerts FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Profiles insert own pre_alerts" ON public.pre_alerts;
CREATE POLICY "Profiles insert own pre_alerts" ON public.pre_alerts FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Operational staff update pre_alerts" ON public.pre_alerts;
CREATE POLICY "Operational staff update pre_alerts" ON public.pre_alerts FOR UPDATE 
  USING (public.is_admin() OR public.has_role('staff'));

-- Ledger (APPEND ONLY)
DROP POLICY IF EXISTS "Profiles view own ledger entries" ON public.financial_ledger;
CREATE POLICY "Profiles view own ledger entries" ON public.financial_ledger FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Operational staff can insert ledger entries" ON public.financial_ledger;
CREATE POLICY "Operational staff can insert ledger entries" ON public.financial_ledger FOR INSERT 
  WITH CHECK (public.is_admin() OR public.has_role('staff'));

-- Audit/System
DROP POLICY IF EXISTS "Operational staff view system logs" ON public.system_logs;
CREATE POLICY "Operational staff view system logs" ON public.system_logs FOR SELECT 
  USING (public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Operational staff view sent emails" ON public.sent_emails;
CREATE POLICY "Operational staff view sent emails" ON public.sent_emails FOR SELECT 
  USING (public.is_admin() OR public.has_role('staff'));

DROP POLICY IF EXISTS "Admins can manage system configs" ON public.system_configs;
CREATE POLICY "Admins can manage system configs" ON public.system_configs FOR ALL 
  USING (public.is_admin());
