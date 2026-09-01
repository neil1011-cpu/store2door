-- Hardened Auth & RBAC Foundation Migration (v2.0)
-- Target Project: FromStore2Door Global Logistics
-- Security Review: May 2026

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
-- Uses SECURITY DEFINER and strict search_path to prevent path hijacking
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

-- 6. Profile Protection Logic (Enforces Column-Level Security)
CREATE OR REPLACE FUNCTION public.protect_immutable_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Prevent modification of system-controlled fields by anyone except service_role
  IF (current_setting('role') <> 'service_role') THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Field "id" is immutable.';
    END IF;
    IF NEW.mailbox_number IS DISTINCT FROM OLD.mailbox_number THEN
      RAISE EXCEPTION 'Field "mailbox_number" is system-assigned and immutable.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Field "created_at" is immutable.';
    END IF;
  END IF;
  
  -- Auto-update timestamps
  NEW.updated_at = now();
  RETURN NEW;
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

  -- 1. Create Profile (Schema-qualified)
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

-- 8. Trigger Registration (Repeatable)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_immutable_profile_fields();

-- 9. Row Level Security Policies (Repeatable)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles: View own or as admin
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Profiles: Update own (Trigger enforces column-level security)
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Roles: View own or as admin
DROP POLICY IF EXISTS "Roles view policy" ON public.app_roles;
CREATE POLICY "Roles view policy"
  ON public.app_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 10. Explicit Permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.profiles, public.app_roles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin, public.has_role TO authenticated;
GRANT USAGE ON SEQUENCE public.mailbox_seq TO authenticated;