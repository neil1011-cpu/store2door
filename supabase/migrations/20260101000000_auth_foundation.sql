-- Hardened Auth & RBAC Foundation Migration
-- Target Project: FromStore2Door Global Logistics
-- Timestamp: 20260101000000

-- 1. Identity Sequence (Thread-safe mailbox numbering)
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 101;

-- 2. User Roles Type
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  trn text,
  mailbox_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. App Roles Table (Authorization Isolation)
CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 5. Authorization Helper Functions
-- Security: SECURITY DEFINER with hardened search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION public.has_role(role_name public.user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 6. Role Management (Authorized Gateway)
CREATE OR REPLACE FUNCTION public.manage_user_role(target_user_id uuid, new_role public.user_role)
RETURNS void AS $$
BEGIN
  -- Explicit check: Caller must already be an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can manage roles.';
  END IF;

  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found in profiles registry.';
  END IF;

  INSERT INTO public.app_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 7. Atomic Registration Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_mailbox_num text;
BEGIN
  -- Generate thread-safe mailbox number
  new_mailbox_num := 'FSTD' || nextval('public.mailbox_seq');

  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, mailbox_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Member'),
    new_mailbox_num
  );

  -- 2. Assign Default Customer Role
  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 8. Updated At Trigger
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 9. Triggers Execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();

-- 10. Role and Object Privileges
-- Explicitly revoke and grant for isolation

-- Functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(public.user_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.manage_user_role(uuid, public.user_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_profile_timestamp() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_role(uuid, public.user_role) TO authenticated;

-- Tables
REVOKE ALL ON public.profiles FROM authenticated;
REVOKE ALL ON public.app_roles FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.app_roles TO authenticated;

-- Column-level Update Security for Profiles
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

-- 11. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Roles view policy" ON public.app_roles;
CREATE POLICY "Roles view policy"
  ON public.app_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());