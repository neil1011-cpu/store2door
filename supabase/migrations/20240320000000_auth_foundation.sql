-- Store2Door: Auth & RBAC Foundation
-- Handles user profiles, mailbox generation, and secure roles.

-- 1. Create a sequence for unique mailbox numbers
CREATE SEQUENCE IF NOT EXISTS mailbox_seq START 101;

-- 2. Profiles Table: Stores non-sensitive identity data
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  trn text,
  mailbox_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. App Roles Table: Stores authorization data
CREATE TABLE IF NOT EXISTS public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('customer', 'staff', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- 5. Authorization Functions (SECURITY DEFINER)
-- We set search_path to public to prevent hijacking.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger: Automatic Profile and Role creation upon Auth registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_mailbox text;
BEGIN
  -- Generate unique mailbox number
  new_mailbox := 'FSTD' || nextval('mailbox_seq');

  -- Create Profile
  INSERT INTO public.profiles (id, full_name, mailbox_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new_mailbox
  );

  -- Assign default 'customer' role
  INSERT INTO public.app_roles (user_id, role)
  VALUES (new.id, 'customer');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RLS Policies: Profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

-- 8. RLS Policies: App Roles
CREATE POLICY "Users can read own roles"
  ON public.app_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
  ON public.app_roles FOR SELECT
  USING (is_admin());

-- Note: No INSERT/UPDATE/DELETE policies for non-admin roles on app_roles.
-- Only service_role or SECURITY DEFINER functions can modify them.
