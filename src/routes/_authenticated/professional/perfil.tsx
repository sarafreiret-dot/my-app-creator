import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { LoadingScreen } from "@/components/feedback/states";
import { AppContent, AppHeader, AppScreen, BottomNav, SignOutButton } from "@/components/layout/AppShell";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { Button } from "@/components/ui/button";
import { accountQueryOptions, homePathForRole } from "@/lib/account";


export const Route = createFileRoute("/_authenticated/professional/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil profesional | ServiGo" },
      {
        name: "description",
        content:
          "Revisa tu profesión, especialidades, tarifas y estado de verificación en ServiGo.",
      },
      { property: "og:title", content: "Mi perfil profesional | ServiGo" },
      {
        property: "og:description",
        content: "Consulta tus datos profesionales en ServiGo.",
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
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  if (!account) return <LoadingScreen />;

  return (
    <AppScreen>
      <AppHeader title="Mi perfil" subtitle="Cuenta profesional" right={<SignOutButton />} />
      <AppContent>
        {editing ? (
          <ProfileEditForm
            account={account}
            onDone={() => {
              void queryClient.invalidateQueries({ queryKey: ["account"] });
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <ProfileSummary account={account} />
            <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Editar mi perfil
            </Button>
          </>
        )}
      </AppContent>
      <BottomNav role="professional" />
    </AppScreen>
  );
}

