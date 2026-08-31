-- ============================================================
-- FASE 1: identidad, roles, perfiles y onboarding
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('client', 'professional', 'admin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- ---------- utilitario updated_at ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  active_role public.app_role NOT NULL DEFAULT 'client',
  approximate_city TEXT,
  approximate_sector TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_active_role_not_admin CHECK (active_role <> 'admin'),
  CONSTRAINT profiles_full_name_len CHECK (char_length(full_name) <= 120),
  CONSTRAINT profiles_city_len CHECK (approximate_city IS NULL OR char_length(approximate_city) <= 80),
  CONSTRAINT profiles_sector_len CHECK (approximate_sector IS NULL OR char_length(approximate_sector) <= 80)
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- profile_private  (telefono + coordenadas exactas)
-- ============================================================
CREATE TABLE public.profile_private (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_private_phone_len CHECK (phone IS NULL OR char_length(phone) BETWEEN 7 AND 25),
  CONSTRAINT profile_private_lat_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT profile_private_lng_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_private_set_updated_at
  BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- user_roles  (sin escritura directa desde el cliente)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: security definer para evitar recursion en politicas
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Asignacion controlada del rol inicial: solo client|professional, solo una vez.
CREATE OR REPLACE FUNCTION public.assign_initial_role(_role public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _existing public.app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF _role NOT IN ('client', 'professional') THEN
    RAISE EXCEPTION 'ROLE_NOT_SELECTABLE';
  END IF;

  SELECT role INTO _existing
  FROM public.user_roles
  WHERE user_id = _uid AND role IN ('client', 'professional')
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);

  INSERT INTO public.profiles (id, active_role)
  VALUES (_uid, _role)
  ON CONFLICT (id) DO UPDATE SET active_role = _role;

  RETURN _role;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_initial_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_initial_role(public.app_role) TO authenticated;

-- ---------- politicas: profiles ----------
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- El rol activo debe coincidir siempre con un rol realmente concedido.
CREATE OR REPLACE FUNCTION public.enforce_active_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_role = 'admin' THEN
    RAISE EXCEPTION 'ROLE_NOT_SELECTABLE';
  END IF;
  IF NOT public.has_role(NEW.id, NEW.active_role) THEN
    RAISE EXCEPTION 'ROLE_NOT_GRANTED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_enforce_active_role
  BEFORE INSERT OR UPDATE OF active_role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_role();

-- ---------- politicas: profile_private ----------
CREATE POLICY "profile_private_select_own" ON public.profile_private
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "profile_private_insert_own" ON public.profile_private
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_private_update_own" ON public.profile_private
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------- politicas: user_roles ----------
-- Solo lectura. Las escrituras pasan por assign_initial_role / service_role.
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- professional_profiles
-- ============================================================
CREATE TABLE public.professional_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profession TEXT NOT NULL DEFAULT '',
  description TEXT,
  years_experience INTEGER NOT NULL DEFAULT 0,
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  coverage_radius INTEGER NOT NULL DEFAULT 5,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  completed_services INTEGER NOT NULL DEFAULT 0,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pp_profession_len CHECK (char_length(profession) <= 80),
  CONSTRAINT pp_description_len CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT pp_years CHECK (years_experience >= 0 AND years_experience <= 70),
  CONSTRAINT pp_base_rate CHECK (base_rate >= 0 AND base_rate <= 100000),
  CONSTRAINT pp_hourly_rate CHECK (hourly_rate >= 0 AND hourly_rate <= 100000),
  CONSTRAINT pp_radius CHECK (coverage_radius >= 1 AND coverage_radius <= 100),
  CONSTRAINT pp_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  CONSTRAINT pp_completed CHECK (completed_services >= 0)
);

GRANT SELECT, INSERT, UPDATE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER professional_profiles_set_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "pp_select_own" ON public.professional_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "pp_select_admin" ON public.professional_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pp_insert_own" ON public.professional_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'professional'));

CREATE POLICY "pp_update_own" ON public.professional_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'professional'))
  WITH CHECK (user_id = auth.uid());

-- El profesional no puede alterar su reputacion ni su verificacion.
CREATE OR REPLACE FUNCTION public.protect_professional_trust_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.average_rating := 0;
    NEW.completed_services := 0;
    NEW.verification_status := 'pending';
  ELSE
    NEW.average_rating := OLD.average_rating;
    NEW.completed_services := OLD.completed_services;
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER professional_profiles_protect_trust
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_professional_trust_fields();

-- ============================================================
-- specialties  /  professional_specialties
-- ============================================================
CREATE TABLE public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialties_slug_len CHECK (char_length(slug) BETWEEN 2 AND 60),
  CONSTRAINT specialties_name_len CHECK (char_length(name) BETWEEN 2 AND 80)
);

GRANT SELECT ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialties_select_authenticated" ON public.specialties
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "specialties_admin_manage" ON public.specialties
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.professional_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, specialty_id)
);

CREATE INDEX professional_specialties_specialty_idx
  ON public.professional_specialties (specialty_id);

GRANT SELECT, INSERT, DELETE ON public.professional_specialties TO authenticated;
GRANT ALL ON public.professional_specialties TO service_role;
ALTER TABLE public.professional_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select_own" ON public.professional_specialties
  FOR SELECT TO authenticated USING (professional_id = auth.uid());

CREATE POLICY "ps_select_admin" ON public.professional_specialties
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ps_insert_own" ON public.professional_specialties
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = auth.uid() AND public.has_role(auth.uid(), 'professional'));

CREATE POLICY "ps_delete_own" ON public.professional_specialties
  FOR DELETE TO authenticated USING (professional_id = auth.uid());

-- ---------- catalogo inicial de especialidades ----------
INSERT INTO public.specialties (slug, name, icon) VALUES
  ('electricista',   'Electricista',            'Zap'),
  ('plomero',        'Plomero / Gasfitero',     'Droplet'),
  ('carpintero',     'Carpintero',              'Hammer'),
  ('albanil',        'Albañil',                 'Brick'),
  ('pintor',         'Pintor',                  'PaintRoller'),
  ('cerrajero',      'Cerrajero',               'KeyRound'),
  ('tecnico-aire',   'Técnico de aire acondicionado', 'Wind'),
  ('tecnico-pc',     'Técnico en computadoras', 'Laptop'),
  ('mecanico',       'Mecánico automotriz',     'Wrench'),
  ('jardinero',      'Jardinero',               'Sprout'),
  ('limpieza',       'Servicio de limpieza',    'SprayCan'),
  ('mudanzas',       'Mudanzas y fletes',       'Truck');
