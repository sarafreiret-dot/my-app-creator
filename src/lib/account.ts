import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilePrivateRow = Database["public"]["Tables"]["profile_private"]["Row"];
export type ProfessionalProfileRow =
  Database["public"]["Tables"]["professional_profiles"]["Row"];
export type SpecialtyRow = Database["public"]["Tables"]["specialties"]["Row"];

export type Account = {
  userId: string;
  email: string | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  onboardingCompleted: boolean;
  profile: ProfileRow | null;
  profilePrivate: ProfilePrivateRow | null;
  professionalProfile: ProfessionalProfileRow | null;
  specialtyIds: string[];
};

export const AVATAR_BUCKET = "avatars";

/** Ruta del panel principal según el rol activo del usuario. */
export function homePathForRole(role: AppRole | null | undefined): string {
  if (role === "professional") return "/professional";
  if (role === "admin") return "/client"; // el panel admin llega en una fase futura
  return "/client";
}

export async function fetchAccount(): Promise<Account | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const userId = userData.user.id;

  const [rolesRes, profileRes, privateRes, proRes, specRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profile_private").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("professional_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("professional_specialties")
      .select("specialty_id")
      .eq("professional_id", userId),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  const profile = profileRes.data ?? null;

  return {
    userId,
    email: userData.user.email ?? null,
    roles,
    activeRole: profile?.active_role ?? null,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    profile,
    profilePrivate: privateRes.data ?? null,
    professionalProfile: proRes.data ?? null,
    specialtyIds: (specRes.data ?? []).map((s) => s.specialty_id),
  };
}

export const accountQueryOptions = () =>
  queryOptions({
    queryKey: ["account"],
    queryFn: fetchAccount,
    staleTime: 30_000,
  });

export const specialtiesQueryOptions = () =>
  queryOptions({
    queryKey: ["specialties"],
    queryFn: async (): Promise<SpecialtyRow[]> => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

/** El bucket de avatares es privado: resolvemos una URL firmada temporal. */
export async function resolveAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
