import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendly-errors";
import { newPasswordSchema } from "@/lib/onboarding-schemas";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Crea una nueva contraseña | Servipro" },
      {
        name: "description",
        content: "Define una contraseña nueva para recuperar el acceso a tu cuenta de Servipro.",
      },
      { property: "og:title", content: "Crea una nueva contraseña | Servipro" },
      {
        property: "og:description",
        content: "Restablece tu contraseña de Servipro de forma segura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) || isRecovery);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
      string,
      string
    >;
    const parsed = newPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      toast.success("Tu contraseña se actualizó correctamente.");
      navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      toast.error(friendlyError(error, "No pudimos actualizar tu contraseña. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-gradient-brand pb-12 pt-10 text-primary-foreground">
        <div className="app-container">
          <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-primary-foreground/75">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>
      </header>

      <main className="app-container -mt-8 flex-1 pb-10">
        {ready === false ? (
          <ErrorState
            title="Enlace no válido o vencido"
            description="Solicita un nuevo enlace de recuperación desde la pantalla de inicio de sesión."
            onRetry={() => navigate({ to: "/auth" })}
          />
        ) : (
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <form noValidate onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    aria-invalid={Boolean(errors['password'])}
                  />
                  {errors['password'] ? (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors['password']}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Repite la contraseña</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors['confirm_password'])}
                  />
                  {errors['confirm_password'] ? (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors['confirm_password']}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  variant="action"
                  size="lg"
                  className="w-full"
                  disabled={loading || ready === null}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <KeyRound aria-hidden />
                  )}
                  Guardar contraseña
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
