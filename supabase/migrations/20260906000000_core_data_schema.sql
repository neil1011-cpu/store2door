-- Core Data Schema Migration
-- Target Project: FromStore2Door Global Logistics
-- Timestamp: 20260906000000

/**
 * @fileOverview Normalized relational schema design for the Store2Door logistics platform.
 * Includes a staff authorization model and idempotent policy definitions.
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

COMMENT ON TABLE public.addresses IS 'Stores normalized delivery and origin addresses for users.';

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

COMMENT ON TABLE public.pickup_personnel IS 'Stores authorized personnel who can collect packages on behalf of a customer.';

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 12. PERMISSIONS
-- Revoke all from PUBLIC to ensure explicit grants
REVOKE ALL ON public.addresses FROM authenticated;
REVOKE ALL ON public.pickup_personnel FROM authenticated;
REVOKE ALL ON public.invoices FROM authenticated;
REVOKE ALL ON public.invoice_line_items FROM authenticated;
REVOKE ALL ON public.shipments FROM authenticated;
REVOKE ALL ON public.shipment_tracking_events FROM authenticated;
REVOKE ALL ON public.pre_alerts FROM authenticated;
REVOKE ALL ON public.financial_ledger FROM authenticated;
REVOKE ALL ON public.system_logs FROM authenticated;
REVOKE ALL ON public.sent_emails FROM authenticated;
REVOKE ALL ON public.system_configs FROM authenticated;

-- Grant broad read to staff/admin, owner read to customers
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant mutation only to authorized roles or owners
GRANT INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pickup_personnel TO authenticated;
GRANT INSERT, UPDATE ON public.pre_alerts TO authenticated;

-- Operational tables: mutation limited to staff/admin
GRANT INSERT, UPDATE ON public.shipments TO authenticated;
GRANT INSERT ON public.shipment_tracking_events TO authenticated;
GRANT INSERT, UPDATE ON public.invoices TO authenticated;
GRANT INSERT, UPDATE ON public.invoice_line_items TO authenticated;
GRANT INSERT ON public.financial_ledger TO authenticated; -- Immutable ledger
GRANT INSERT ON public.system_logs TO authenticated;

-- 13. ROW LEVEL SECURITY POLICIES
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

-- Helper to check for operational staff/admin roles
CREATE OR REPLACE FUNCTION public.is_operational() 
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role('staff') OR public.is_admin();
END;
$$ LANGUAGE plpgsql STABLE;

-- Addresses
DROP POLICY IF EXISTS "Addresses view policy" ON public.addresses;
CREATE POLICY "Addresses view policy" ON public.addresses FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Addresses management policy" ON public.addresses;
CREATE POLICY "Addresses management policy" ON public.addresses FOR ALL 
  USING (auth.uid() = profile_id OR public.is_operational());

-- Pickup Personnel
DROP POLICY IF EXISTS "Pickup view policy" ON public.pickup_personnel;
CREATE POLICY "Pickup view policy" ON public.pickup_personnel FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Pickup management policy" ON public.pickup_personnel;
CREATE POLICY "Pickup management policy" ON public.pickup_personnel FOR ALL 
  USING (auth.uid() = profile_id OR public.is_operational());

-- Invoices
DROP POLICY IF EXISTS "Invoices view policy" ON public.invoices;
CREATE POLICY "Invoices view policy" ON public.invoices FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Invoices staff mutation" ON public.invoices;
CREATE POLICY "Invoices staff mutation" ON public.invoices FOR INSERT 
  WITH CHECK (public.is_operational());

DROP POLICY IF EXISTS "Invoices staff update" ON public.invoices;
CREATE POLICY "Invoices staff update" ON public.invoices FOR UPDATE 
  USING (public.is_operational());

-- Invoice Line Items
DROP POLICY IF EXISTS "Line items view policy" ON public.invoice_line_items;
CREATE POLICY "Line items view policy" ON public.invoice_line_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND (profile_id = auth.uid() OR public.is_operational())));

DROP POLICY IF EXISTS "Line items staff mutation" ON public.invoice_line_items;
CREATE POLICY "Line items staff mutation" ON public.invoice_line_items FOR ALL 
  USING (public.is_operational());

-- Shipments
DROP POLICY IF EXISTS "Shipments view policy" ON public.shipments;
CREATE POLICY "Shipments view policy" ON public.shipments FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Shipments staff mutation" ON public.shipments;
CREATE POLICY "Shipments staff mutation" ON public.shipments FOR ALL 
  USING (public.is_operational());

-- Shipment Tracking Events
DROP POLICY IF EXISTS "Tracking events view policy" ON public.shipment_tracking_events;
CREATE POLICY "Tracking events view policy" ON public.shipment_tracking_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE id = shipment_id AND (profile_id = auth.uid() OR public.is_operational())));

DROP POLICY IF EXISTS "Tracking events staff insertion" ON public.shipment_tracking_events;
CREATE POLICY "Tracking events staff insertion" ON public.shipment_tracking_events FOR INSERT 
  WITH CHECK (public.is_operational());

-- Pre-Alerts
DROP POLICY IF EXISTS "Pre-alerts view policy" ON public.pre_alerts;
CREATE POLICY "Pre-alerts view policy" ON public.pre_alerts FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Pre-alerts customer insertion" ON public.pre_alerts;
CREATE POLICY "Pre-alerts customer insertion" ON public.pre_alerts FOR INSERT 
  WITH CHECK (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Pre-alerts staff update" ON public.pre_alerts;
CREATE POLICY "Pre-alerts staff update" ON public.pre_alerts FOR UPDATE 
  USING (public.is_operational());

-- Ledger (Immutable)
DROP POLICY IF EXISTS "Ledger view policy" ON public.financial_ledger;
CREATE POLICY "Ledger view policy" ON public.financial_ledger FOR SELECT 
  USING (auth.uid() = profile_id OR public.is_operational());

DROP POLICY IF EXISTS "Ledger staff insertion" ON public.financial_ledger;
CREATE POLICY "Ledger staff insertion" ON public.financial_ledger FOR INSERT 
  WITH CHECK (public.is_operational());

-- Audit/System (Staff & Admin Read)
DROP POLICY IF EXISTS "System logs view policy" ON public.system_logs;
CREATE POLICY "System logs view policy" ON public.system_logs FOR SELECT 
  USING (public.is_operational());

DROP POLICY IF EXISTS "Sent emails view policy" ON public.sent_emails;
CREATE POLICY "Sent emails view policy" ON public.sent_emails FOR SELECT 
  USING (public.is_operational());

-- Configuration (Admin Only)
DROP POLICY IF EXISTS "System configs admin policy" ON public.system_configs;
CREATE POLICY "System configs admin policy" ON public.system_configs FOR ALL 
  USING (public.is_admin());
