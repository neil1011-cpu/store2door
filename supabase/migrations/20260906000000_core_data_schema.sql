-- Store2Door Core Data Schema Migration
-- Purpose: Normalized relational replacement for Firebase documents.
-- Timestamp: 20260906000000

-- 1. ADDRESSES
-- Normalizes embedded user addresses and dropoff arrays.
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text, -- e.g., 'Home', 'Office', 'Recipient Name'
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  parish text, -- Specific to Jamaica logistics
  state text, -- Specific to Florida logistics
  zip text,
  country text DEFAULT 'Jamaica',
  is_default boolean DEFAULT false,
  address_type text CHECK (address_type IN ('shipping', 'billing', 'dropoff')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. PICKUP PERSONNEL
-- Normalizes the users.pickupPersonnel array into reusable contacts.
CREATE TABLE IF NOT EXISTS public.pickup_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  id_number text NOT NULL, -- Government ID for verification at branch
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. PRE-ALERTS
-- Tracks incoming documentation before warehouse intake.
CREATE TABLE IF NOT EXISTS public.pre_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  contents text,
  weight_lbs numeric(10,2),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processed')),
  invoice_url text, -- Original document URL (Vultr/S3)
  legacy_firebase_id text, -- Traceability back to Firestore
  submission_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. INVOICES
-- Master billing records.
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL, -- Business ID (e.g., INV-1001)
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Cancelled', 'Refunded')),
  invoice_url text, -- Generated HTML/PDF URL
  due_date timestamptz,
  legacy_firebase_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. SHIPMENTS
-- Core logistics records.
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  tracking_number text UNIQUE NOT NULL,
  contents text,
  status text DEFAULT 'Pending', -- Transitioning to tracking table for history
  shipping_date timestamptz,
  weight_lbs numeric(10,2),
  cost_jmd numeric(12,2),
  payment_status text DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid')),
  logicware_id text, -- ID from external Hub
  internal_barcode text, -- FSTD specific barcode
  legacy_firebase_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. SHIPMENT TRACKING EVENTS
-- Immutable history of logistics movements.
CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  location text,
  event_timestamp timestamptz DEFAULT now(),
  actor_id uuid REFERENCES public.profiles(id), -- Who performed the update
  source text DEFAULT 'system' CHECK (source IN ('system', 'logicware_webhook', 'manual')),
  created_at timestamptz DEFAULT now()
);

-- 7. INVOICE LINE ITEMS
-- Atomic breakdown of charges.
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL, -- Proposed: Derived but stored for audit
  created_at timestamptz DEFAULT now()
);

-- 8. FINANCIAL LEDGER (IMMUTABLE)
-- The source of truth for all balances. No mutable walletBalance column.
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL, -- Positive for credit/payment, negative for debit/fee
  entry_type text NOT NULL CHECK (entry_type IN ('revenue', 'expense', 'credit', 'debit')),
  category text NOT NULL, -- e.g., 'shipping_fee', 'customs_duty', 'pos_payment', 'refund'
  description text,
  payment_method text, -- e.g., 'Cash', 'Card', 'Transfer', 'Wallet'
  source text DEFAULT 'system', -- e.g., 'POS', 'Online', 'Auto'
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 9. SYSTEM LOGS & AUDIT
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL,
  description text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 10. SENT EMAILS AUDIT
CREATE TABLE IF NOT EXISTS public.sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_text text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 11. SYSTEM CONFIGURATION
-- Non-secret application settings.
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- POLICIES (Pattern: Users see own, Admins see all)

-- Addresses
CREATE POLICY "Users view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = profile_id);

-- Shipments/Invoices/Ledger
CREATE POLICY "Users view own logistics" ON public.shipments FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());
CREATE POLICY "Users view own billing" ON public.invoices FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());
CREATE POLICY "Users view own ledger" ON public.financial_ledger FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());

-- Pre-Alerts (Users can create)
CREATE POLICY "Users manage own pre_alerts" ON public.pre_alerts FOR ALL USING (auth.uid() = profile_id OR public.is_admin());

-- System Logs/Emails (Admin Only)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view system audits" ON public.system_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins view email logs" ON public.sent_emails FOR SELECT USING (public.is_admin());

-- 13. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_ledger_profile ON public.financial_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_tracking_shipment ON public.shipment_tracking_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
