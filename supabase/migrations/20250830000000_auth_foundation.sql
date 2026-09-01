-- STORE2DOOR AUTH & RBAC FOUNDATION
-- Audited: 2025-08-30
-- Target: Supabase / PostgreSQL 15+

-- 1. EXTENSIONS & CLEANUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MAILBOX SEQUENCE (Thread-safe, starting at 101)
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 101;

-- 3. APP ROLES (Enum-like lookup table)
CREATE TABLE IF NOT EXISTS public.app_roles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(id, role)
);

-- 4. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    phone text,
    trn text,
    mailbox_number text UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. AUTHORIZATION FUNCTIONS (Hardened SECURITY DEFINER)
-- We set search_path to public to prevent hijacking via other schemas.

CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_roles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(target_role text) 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_roles 
        WHERE id = auth.uid() AND role = target_role
    );
END;
$$;

-- 6. AUTOMATED ONBOARDING TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    new_mailbox text;
BEGIN
    -- Generate unique mailbox number
    new_mailbox := 'FSTD' || nextval('public.mailbox_seq')::text;

    -- 1. Create Profile
    INSERT INTO public.profiles (id, full_name, mailbox_number)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        new_mailbox
    );

    -- 2. Assign Default Role
    INSERT INTO public.app_roles (id, role)
    VALUES (new.id, 'customer');

    RETURN new;
END;
$$;

-- Apply Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by owner or admin" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR is_admin());

CREATE POLICY "Profiles can be updated by owner" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- App Roles Policies
CREATE POLICY "Roles are viewable by owner or admin" 
ON public.app_roles FOR SELECT 
USING (auth.uid() = id OR is_admin());

-- NO client-side insert/update/delete on roles allowed.
-- Administrative role modification happens via Service Role only.

-- 8. INDEXING for high-performance joins
CREATE INDEX IF NOT EXISTS idx_profiles_mailbox ON public.profiles(mailbox_number);
CREATE INDEX IF NOT EXISTS idx_app_roles_id_role ON public.app_roles(id, role);
