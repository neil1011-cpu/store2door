
-- Store2Door Auth Foundation Migration
-- Establishes Profiles, Roles, and hardened RLS

-- 1. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('customer', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES
-- Profiles: Core identity linked to Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text,
  phone          text,
  trn            text,
  mailbox_number text UNIQUE,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- App Roles: Authorization separate from Profile
CREATE TABLE IF NOT EXISTS public.app_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       public.app_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 101;

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.generate_mailbox() 
RETURNS text AS $$
BEGIN
  RETURN 'FSTD' || nextval('public.mailbox_seq')::text;
END;
$$ LANGUAGE plpgsql;

-- 5. AUTHORIZATION FUNCTIONS (Used in RLS)
CREATE OR REPLACE FUNCTION public.has_role(role_name public.app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS CONFIGURATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Roles Policies
CREATE POLICY "Users can view own roles"
  ON public.app_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.app_roles FOR SELECT
  USING (public.is_admin());

-- 7. TRIGGERS (Automated Onboarding)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create initial profile
  INSERT INTO public.profiles (id, full_name, mailbox_number)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    public.generate_mailbox()
  );

  -- Assign default role
  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up existing trigger if any to prevent duplicates during re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
