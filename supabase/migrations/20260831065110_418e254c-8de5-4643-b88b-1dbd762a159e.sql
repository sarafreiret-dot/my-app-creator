-- Las funciones de trigger no deben ser invocables por nadie desde la API.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_active_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_professional_trust_fields() FROM PUBLIC, anon, authenticated;

-- Estas dos si deben ser llamables, pero solo por usuarios autenticados.
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_initial_role(public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_initial_role(public.app_role) TO authenticated;
