CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_verified_professional(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    INNER JOIN public.professional_profiles AS pp
      ON pp.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'professional'::public.app_role
      AND pp.verification_status = 'verified'::public.verification_status
  );
$$;

REVOKE ALL ON FUNCTION private.is_verified_professional(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_verified_professional(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION private.is_verified_professional(UUID) IS
  'Regla interna obligatoria para políticas RLS y operaciones profesionales futuras; pending y rejected devuelven false.';

DROP FUNCTION public.is_verified_professional(UUID);