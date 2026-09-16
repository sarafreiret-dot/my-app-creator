import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BadgeCheck, Clock, Sparkles, Wrench } from "lucide-react";

import { EmptyState, LoadingScreen } from "@/components/feedback/states";
import { AppContent, AppHeader, AppScreen, BottomNav, SignOutButton } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { accountQueryOptions, homePathForRole } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/professional/")({
  head: () => ({
    meta: [
      { title: "Mi panel profesional | ServiGo" },
      {
        name: "description",
        content:
          "Consulta el estado de tu perfil profesional en ServiGo y prepárate para recibir solicitudes de servicio.",
      },
      { property: "og:title", content: "Mi panel profesional | ServiGo" },
      {
        property: "og:description",
        content: "Gestiona tu perfil profesional en ServiGo.",
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
  component: ProfessionalHome,
  pendingComponent: () => <LoadingScreen label="Cargando tu panel…" />,
});

function ProfessionalHome() {
  const { data: account } = useQuery(accountQueryOptions());
  const firstName = account?.profile?.full_name?.split(" ")[0] ?? "";
  const status = account?.professionalProfile?.verification_status;

  return (
    <AppScreen>
      <AppHeader
        title={firstName ? `Hola, ${firstName}` : "Hola"}
        subtitle={account?.professionalProfile?.profession ?? "Cuenta profesional"}
        right={<SignOutButton />}
      />
      <AppContent>
        <Card className="shadow-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Estado de tu perfil</p>
                <p className="text-xs text-muted-foreground">
                  {status === "verified"
                    ? "Tu perfil fue verificado por nuestro equipo."
                    : status === "rejected"
                      ? "Tu verificación fue rechazada. Contáctanos para revisarla."
                      : "Nuestro equipo revisará tus datos antes de habilitarte."}
                </p>
              </div>
              {status === "verified" ? (
                <Badge variant="success">
                  <BadgeCheck className="mr-1 size-3" aria-hidden /> Verificado
                </Badge>
              ) : status === "rejected" ? (
                <Badge variant="destructive">Rechazado</Badge>
              ) : (
                <Badge variant="warning">
                  <Clock className="mr-1 size-3" aria-hidden /> En revisión
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <EmptyState
          icon={<Wrench className="size-5" aria-hidden />}
          title="Aún no puedes recibir solicitudes"
          description="La disponibilidad y las solicitudes de servicio llegan en la siguiente etapa. Por ahora mantén tu perfil completo y actualizado."
        />

        <div className="flex items-start gap-2 rounded-xl bg-action-soft p-3">
          <Sparkles className="mt-0.5 size-4 text-action" aria-hidden />
          <p className="text-xs text-action">
            Siguiente etapa: disponibilidad (disponible ahora, no disponible y programada) y panel de
            trabajo.
          </p>
        </div>
      </AppContent>
      <BottomNav role="professional" />
    </AppScreen>
  );
}
