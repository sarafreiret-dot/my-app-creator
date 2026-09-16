import { Link, createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, ShieldCheck, Sparkles, Star, UserRound, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiGo | Profesionales de confianza cerca de ti" },
      {
        name: "description",
        content:
          "ServiGo conecta a clientes con electricistas, plomeros, técnicos y más profesionales verificados. Crea tu cuenta gratis y empieza en minutos.",
      },
      { property: "og:title", content: "ServiGo | Profesionales de confianza cerca de ti" },
      {
        property: "og:description",
        content:
          "Encuentra profesionales verificados u ofrece tus servicios. Crea tu cuenta gratis en ServiGo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <section className="bg-gradient-brand pb-14 pt-12 text-primary-foreground">
        <div className="app-container">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="size-3.5" aria-hidden /> Perfiles revisados por nuestro equipo
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            Profesionales de confianza, cerca de ti
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80">
            Electricistas, plomeros, técnicos y más. Crea tu cuenta, cuéntanos qué necesitas y
            conéctate con quien puede ayudarte. También puedes registrarte para ofrecer tus
            servicios.
          </p>

          <div className="mt-6 space-y-2">
            {signedIn ? (
              <Button asChild variant="action" size="xl" className="w-full">
                <Link to="/onboarding">Ir a mi cuenta</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="action" size="xl" className="w-full">
                  <Link to="/auth">Crear mi cuenta gratis</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="w-full text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Link to="/auth">Ya tengo cuenta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="app-container -mt-8 flex-1 space-y-4 pb-12">
        <Card className="shadow-card">
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-base font-semibold text-foreground">Cómo funciona</h2>
            <Step
              icon={UserRound}
              title="1. Crea tu cuenta"
              text="Elige si buscas servicios o si los ofreces."
            />
            <Step
              icon={ClipboardCheck}
              title="2. Completa tu perfil"
              text="Solo pedimos lo necesario. Tu teléfono y tu ubicación exacta se mantienen privados."
            />
            <Step
              icon={Wrench}
              title="3. Conéctate"
              text="Pronto podrás buscar profesionales disponibles y solicitar un servicio."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="space-y-3 pt-6">
            <h2 className="text-base font-semibold text-foreground">Pensado para tu tranquilidad</h2>
            <Bullet icon={ShieldCheck} text="Tus datos sensibles nunca se muestran públicamente." />
            <Bullet icon={Star} text="Calificaciones reales de servicios completados." />
            <Bullet icon={Sparkles} text="Una interfaz simple, para cualquier nivel de experiencia." />
          </CardContent>
        </Card>

        <p className="px-2 text-center text-xs text-muted-foreground">
          Estamos construyendo ServiGo por etapas. Hoy puedes crear tu cuenta y dejar tu perfil
          listo.
        </p>
      </main>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UserRound;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-action-soft text-action">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Bullet({ icon: Icon, text }: { icon: typeof UserRound; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
