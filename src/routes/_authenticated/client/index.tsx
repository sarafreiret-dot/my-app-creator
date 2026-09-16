import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { MapPin, Search, Sparkles } from "lucide-react";

import { EmptyState, LoadingScreen } from "@/components/feedback/states";
import { AppContent, AppHeader, AppScreen, BottomNav, SignOutButton } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { accountQueryOptions, homePathForRole } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/client/")({
  head: () => ({
    meta: [
      { title: "Mi panel de cliente | ServiGo" },
      {
        name: "description",
        content:
          "Tu espacio en ServiGo para gestionar tu perfil y, muy pronto, contratar profesionales cerca de ti.",
      },
      { property: "og:title", content: "Mi panel de cliente | ServiGo" },
      {
        property: "og:description",
        content: "Gestiona tu cuenta de cliente en ServiGo.",
      },
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
  component: ClientHome,
  pendingComponent: () => <LoadingScreen label="Cargando tu panel…" />,
});

function ClientHome() {
  const { data: account } = useQuery(accountQueryOptions());
  const firstName = account?.profile?.full_name?.split(" ")[0] ?? "";

  return (
    <AppScreen>
      <AppHeader
        title={firstName ? `Hola, ${firstName}` : "Hola"}
        subtitle="Tu cuenta de cliente está lista."
        right={<SignOutButton />}
      />
      <AppContent>
        <Card className="shadow-card">
          <CardContent className="space-y-1 pt-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {account?.profile?.approximate_sector && account?.profile?.approximate_city
                ? `${account.profile.approximate_sector}, ${account.profile.approximate_city}`
                : "Sin zona registrada"}
            </div>
            <p className="text-xs text-muted-foreground">
              Solo guardamos tu zona aproximada. Tu dirección exacta y tu teléfono se comparten
              únicamente cuando tengas un servicio activo.
            </p>
          </CardContent>
        </Card>

        <EmptyState
          icon={<Search className="size-5" aria-hidden />}
          title="La búsqueda de profesionales llega pronto"
          description="Estamos construyendo la búsqueda por especialidad y cercanía. Por ahora puedes revisar y actualizar tu perfil."
        />

        <div className="flex items-start gap-2 rounded-xl bg-action-soft p-3">
          <Sparkles className="mt-0.5 size-4 text-action" aria-hidden />
          <p className="text-xs text-action">
            Siguiente etapa: ubicación, disponibilidad y búsqueda de profesionales.
          </p>
        </div>
      </AppContent>
      <BottomNav role="client" />
    </AppScreen>
  );
}
