import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoadingScreen } from "@/components/feedback/states";
import { AppContent, AppHeader, AppScreen, BottomNav, SignOutButton } from "@/components/layout/AppShell";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { accountQueryOptions, homePathForRole } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/client/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil de cliente | Servipro" },
      {
        name: "description",
        content: "Revisa tus datos de contacto y tu zona registrada en Servipro.",
      },
      { property: "og:title", content: "Mi perfil de cliente | Servipro" },
      { property: "og:description", content: "Consulta y cuida tus datos en Servipro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQueryOptions());
    if (!account) throw redirect({ to: "/auth" });
    if (!account.onboardingCompleted) throw redirect({ to: "/onboarding" });
    if (!account.roles.includes("client")) {
      throw redirect({ to: homePathForRole(account.activeRole) });
    }
    return null;
  },
  component: ClientProfilePage,
  pendingComponent: () => <LoadingScreen label="Cargando tu perfil…" />,
});

function ClientProfilePage() {
  const { data: account } = useQuery(accountQueryOptions());
  if (!account) return <LoadingScreen />;

  return (
    <AppScreen>
      <AppHeader title="Mi perfil" subtitle="Cuenta de cliente" right={<SignOutButton />} />
      <AppContent>
        <ProfileSummary account={account} />
      </AppContent>
      <BottomNav role="client" />
    </AppScreen>
  );
}
