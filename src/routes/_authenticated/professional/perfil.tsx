import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoadingScreen } from "@/components/feedback/states";
import { AppContent, AppHeader, AppScreen, BottomNav, SignOutButton } from "@/components/layout/AppShell";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { accountQueryOptions, homePathForRole } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/professional/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil profesional | Servipro" },
      {
        name: "description",
        content:
          "Revisa tu profesión, especialidades, tarifas y estado de verificación en Servipro.",
      },
      { property: "og:title", content: "Mi perfil profesional | Servipro" },
      {
        property: "og:description",
        content: "Consulta tus datos profesionales en Servipro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQueryOptions());
    if (!account) throw redirect({ to: "/auth" });
    if (!account.onboardingCompleted) throw redirect({ to: "/onboarding" });
    if (!account.roles.includes("professional")) {
      throw redirect({ to: homePathForRole(account.activeRole) });
    }
    return null;
  },
  component: ProfessionalProfilePage,
  pendingComponent: () => <LoadingScreen label="Cargando tu perfil…" />,
});

function ProfessionalProfilePage() {
  const { data: account } = useQuery(accountQueryOptions());
  if (!account) return <LoadingScreen />;

  return (
    <AppScreen>
      <AppHeader title="Mi perfil" subtitle="Cuenta profesional" right={<SignOutButton />} />
      <AppContent>
        <ProfileSummary account={account} />
      </AppContent>
      <BottomNav role="professional" />
    </AppScreen>
  );
}
