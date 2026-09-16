import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { toast } from "sonner";

import { SuccessState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendly-errors";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/onboarding-schemas";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresa o crea tu cuenta | ServiGo" },
      {
        name: "description",
        content:
          "Accede a ServiGo con tu correo o con Google para contratar profesionales verificados u ofrecer tus servicios.",
      },
      { property: "og:title", content: "Ingresa o crea tu cuenta | ServiGo" },
      {
        property: "og:description",
        content: "Entra a ServiGo y conecta con profesionales de confianza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState<"confirm" | "reset" | null>(null);

  // Si ya hay sesión activa, seguimos al flujo de onboarding/panel.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/onboarding", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function afterSignedIn() {
    await queryClient.invalidateQueries({ queryKey: ["account"] });
    navigate({ to: "/onboarding", replace: true });
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(friendlyError(result.error, "No pudimos iniciar sesión con Google."));
        return;
      }
      if (result.redirected) return;
      await afterSignedIn();
    } catch (error) {
      toast.error(friendlyError(error, "No pudimos iniciar sesión con Google."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
    setErrors({});
    setLoading(true);

    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return setErrors(flatten(parsed.error.issues));
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        await afterSignedIn();
        return;
      }

      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(raw);
        if (!parsed.success) return setErrors(flatten(parsed.error.issues));
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setEmailSent("confirm");
          return;
        }
        await afterSignedIn();
        return;
      }

      const parsed = forgotPasswordSchema.safeParse(raw);
      if (!parsed.success) return setErrors(flatten(parsed.error.issues));
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEmailSent("reset");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
        <div className="app-container">
          <SuccessState
            title={emailSent === "confirm" ? "Revisa tu correo" : "Correo enviado"}
            description={
              emailSent === "confirm"
                ? "Te enviamos un enlace para confirmar tu cuenta. Ábrelo y vuelve a iniciar sesión."
                : "Te enviamos un enlace para crear una nueva contraseña."
            }
          />
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              setEmailSent(null);
              setMode("signin");
            }}
          >
            Volver a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-gradient-brand pb-12 pt-10 text-primary-foreground">
        <div className="app-container">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="size-3.5" aria-hidden /> Profesionales verificados
          </span>
          <h1 className="mt-3 text-2xl font-semibold">
            {mode === "forgot" ? "Recupera tu acceso" : "Bienvenido a ServiGo"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/75">
            {mode === "forgot"
              ? "Te enviaremos un enlace para crear una contraseña nueva."
              : "Contrata profesionales cerca de ti u ofrece tus servicios."}
          </p>
        </div>
      </header>

      <main className="app-container -mt-8 flex-1 pb-10">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            {mode === "forgot" ? (
              <form noValidate onSubmit={handleSubmit} className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => setMode("signin")}
                >
                  <ArrowLeft aria-hidden /> Volver
                </Button>
                <FieldInput
                  name="email"
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  error={errors['email']}
                />
                <Button type="submit" variant="action" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
                  Enviar enlace
                </Button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(value) => { setMode(value as Mode); setErrors({}); }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-5">
                  <form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <FieldInput
                      name="email"
                      label="Correo electrónico"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      error={errors['email']}
                    />
                    <FieldInput
                      name="password"
                      label="Contraseña"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      error={errors['password']}
                    />
                    <button
                      type="button"
                      className="text-sm font-medium text-action hover:underline"
                      onClick={() => { setMode("forgot"); setErrors({}); }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                    <Button type="submit" variant="action" size="lg" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <FieldInput
                      name="email"
                      label="Correo electrónico"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      error={errors['email']}
                    />
                    <FieldInput
                      name="password"
                      label="Contraseña"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      error={errors['password']}
                    />
                    <FieldInput
                      name="confirm_password"
                      label="Repite tu contraseña"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      error={errors['confirm_password']}
                    />
                    <Button type="submit" variant="action" size="lg" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
                      Crear mi cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            {mode !== "forgot" ? (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">o</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                  onClick={() => void handleGoogle()}
                >
                  Continuar con Google
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function flatten(issues: { path: (string | number)[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function FieldInput({
  name,
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={Boolean(error)} {...props} />
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
