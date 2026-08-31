
-- Store2Door Auth Foundation Migration
-- Purpose: Establish profiles, roles, and auto-provisioning triggers.

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  trn text,
  mailbox_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TYPE app_role AS ENUM ('customer', 'staff', 'admin');

CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 2. Mailbox Sequence
CREATE SEQUENCE IF NOT EXISTS mailbox_seq START 101;

-- 3. Authorization Functions (Hardened with search_path)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(target_role app_role) 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_roles 
    WHERE user_id = auth.uid() AND role = target_role
  );
$$;

-- 4. Auto-Profile Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  new_mailbox text;
BEGIN
  -- Generate atomic mailbox number
  new_mailbox := 'FSTD' || nextval('mailbox_seq');

  -- Create Profile
  INSERT INTO public.profiles (id, full_name, mailbox_number)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new_mailbox);

  -- Assign Default Role
  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer');

  RETURN new;
END;
$$;

-- 5. Bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (is_admin());

-- Roles Policies
CREATE POLICY "Users can view own roles" 
ON public.app_roles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.app_roles FOR SELECT 
TO authenticated 
USING (is_admin());

-- Note: No INSERT/UPDATE/DELETE policies for authenticated users on app_roles.
-- These operations are restricted to the service_role (Admin Client).
