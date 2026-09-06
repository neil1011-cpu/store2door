-- Hardened Auth & RBAC Foundation Migration
-- Target Project: FromStore2Door Global Logistics
-- Timestamp: 2026-05-20 (Synchronized for current migration workflow)

-- 1. Identity Sequence (Thread-safe mailbox numbering)
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 101;

-- 2. User Roles Type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin');
    END IF;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  trn text,
  mailbox_number text UNIQUE,
  created_at timestamptz DEFAULT pg_catalog.now() NOT NULL,
  updated_at timestamptz DEFAULT pg_catalog.now() NOT NULL
);

-- 4. App Roles Table (Authorization Isolation)
CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT pg_catalog.now() NOT NULL,
  UNIQUE(user_id, role)
);

-- 5. Trigger Functions (System Context)
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_mailbox_num text;
BEGIN
  -- Atomic nextval ensures concurrency safety
  new_mailbox_num := 'FSTD' || pg_catalog.nextval('public.mailbox_seq');

  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, mailbox_number)
  VALUES (
    new.id,
    pg_catalog.coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Member'),
    new_mailbox_num
  );

  -- 2. Assign Default Customer Role
  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 6. Authorization Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN pg_catalog.exists (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION public.has_role(role_name public.user_role)
RETURNS boolean AS $$
BEGIN
  RETURN pg_catalog.exists (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 7. Role Management (Verification Enforced)
-- This function allows an existing admin to manage other users' roles
CREATE OR REPLACE FUNCTION public.manage_user_role(target_user_id uuid, new_role public.user_role)
RETURNS void AS $$
BEGIN
  -- Strict Authorization: Caller must be an authorized admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrative authority required.';
  END IF;

  -- Atomic Upsert
  INSERT INTO public.app_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 8. Bind Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();

-- 9. Function Permissions (Hardened)
-- Revoke all execution from PUBLIC (prevents anon/unauth abuse)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(public.user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_profile_timestamp() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manage_user_role(uuid, public.user_role) FROM PUBLIC;

-- Grant minimal necessary execution to authenticated role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_role(uuid, public.user_role) TO authenticated;

-- 10. Table & Column Permissions (Hardened)
-- Revoke broad update from profiles
REVOKE UPDATE ON public.profiles FROM PUBLIC;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Grant granular column updates for self-service fields
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

-- Grant select for visibility (controlled by RLS)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.app_roles TO authenticated;

-- 11. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles: SELECT Policy
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Profiles: UPDATE Policy
-- Note: User can only update their own record, and only the columns granted in step 10
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Roles: SELECT Policy
DROP POLICY IF EXISTS "Roles view policy" ON public.app_roles;
CREATE POLICY "Roles view policy"
  ON public.app_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Role Mutation Logic: 
-- No INSERT/UPDATE/DELETE policies are granted to authenticated users.
-- Only the SECURITY DEFINER function 'manage_user_role' (which checks is_admin())
-- or the service_role can modify this table.