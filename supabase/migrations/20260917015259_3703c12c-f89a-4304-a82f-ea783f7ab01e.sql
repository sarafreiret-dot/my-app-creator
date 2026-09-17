REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profile_private FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.professional_profiles FROM anon;
REVOKE ALL ON TABLE public.professional_specialties FROM anon;

REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.profile_private FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_private TO authenticated;

REVOKE ALL ON TABLE public.user_roles FROM authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

REVOKE ALL ON TABLE public.professional_profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.professional_profiles TO authenticated;

REVOKE ALL ON TABLE public.professional_specialties FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.professional_specialties TO authenticated;