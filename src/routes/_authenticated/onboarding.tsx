import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Briefcase, Loader2, UserRound } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { toast } from "sonner";

import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ErrorState, LoadingScreen } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  accountQueryOptions,
  homePathForRole,
  specialtiesQueryOptions,
  type AppRole,
} from "@/lib/account";
import { friendlyError } from "@/lib/friendly-errors";
import {
  baseProfileSchema,
  professionalProfileSchema,
  type BaseProfileValues,
} from "@/lib/onboarding-schemas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Completa tu perfil | ServiGo" },
      {
        name: "description",
        content:
          "Elige si buscas servicios o los ofreces y completa tu perfil para empezar a usar ServiGo.",
      },
      { property: "og:title", content: "Completa tu perfil | ServiGo" },
      {
        property: "og:description",
        content: "Configura tu cuenta de cliente o profesional en ServiGo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQueryOptions());
    if (!account) throw redirect({ to: "/auth" });
    if (account.onboardingCompleted) {
      throw redirect({ to: homePathForRole(account.activeRole) });
    }
    return null;
  },
  component: OnboardingPage,
  pendingComponent: () => <LoadingScreen label="Preparando tu registro…" />,
  errorComponent: () => (
    <div className="app-container py-10">
      <ErrorState description="No pudimos cargar tu registro. Recarga la página e inténtalo de nuevo." />
    </div>
  ),
});

type Step = "role" | "profile";
type SelectableRole = Extract<AppRole, "client" | "professional">;

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account } = useQuery(accountQueryOptions());
  const specialties = useQuery(specialtiesQueryOptions());

  const initialRole = (account?.roles.find((r) => r !== "admin") ?? null) as SelectableRole | null;
  const [role, setRole] = useState<SelectableRole | null>(initialRole);
  const [step, setStep] = useState<Step>(initialRole ? "profile" : "role");
  const [avatarPath, setAvatarPath] = useState<string | null>(account?.profile?.avatar_url ?? null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    account?.specialtyIds ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const assignRole = useMutation({
    mutationFn: async (selected: SelectableRole) => {
      const { data, error } = await supabase.rpc("assign_initial_role", { _role: selected });
      if (error) throw error;
      return data as AppRole;
    },
    onSuccess: async (granted) => {
      setRole(granted === "professional" ? "professional" : "client");
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      setStep("profile");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "No pudimos guardar tu tipo de cuenta. Inténtalo de nuevo.")),
  });

  const saveProfile = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!account) throw new Error("AUTH_REQUIRED");

      const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

      if (role === "professional") {
        const parsed = professionalProfileSchema.safeParse({
          ...raw,
          specialty_ids: selectedSpecialties,
        });
        if (!parsed.success) {
          throw { fieldErrors: flattenErrors(parsed.error.issues) };
        }
        if (!avatarPath) {
          throw { fieldErrors: { avatar: "Sube una foto de perfil para continuar." } };
        }
        const values = parsed.data;

        await savePublicProfile(account.userId, values, avatarPath, "professional");
        await savePrivateProfile(account.userId, values.phone);

        const { error: proError } = await supabase.from("professional_profiles").upsert(
          {
            user_id: account.userId,
            profession: values.profession,
            description: values.description,
            years_experience: values.years_experience,
            base_rate: values.base_rate,
            hourly_rate: values.hourly_rate,
            coverage_radius: values.coverage_radius,
          },
          { onConflict: "user_id" },
        );
        if (proError) throw proError;

        const { error: delError } = await supabase
          .from("professional_specialties")
          .delete()
          .eq("professional_id", account.userId);
        if (delError) throw delError;

        const { error: specError } = await supabase.from("professional_specialties").insert(
          values.specialty_ids.map((specialtyId) => ({
            professional_id: account.userId,
            specialty_id: specialtyId,
          })),
        );
        if (specError) throw specError;
      } else {
        const parsed = baseProfileSchema.safeParse(raw);
        if (!parsed.success) {
          throw { fieldErrors: flattenErrors(parsed.error.issues) };
        }
        await savePublicProfile(account.userId, parsed.data, avatarPath, "client");
        await savePrivateProfile(account.userId, parsed.data.phone);
      }

      const { error: finishError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", account.userId);
      if (finishError) throw finishError;
    },
    onSuccess: async () => {
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("¡Listo! Tu perfil quedó configurado.");
      navigate({ to: homePathForRole(role ?? "client"), replace: true });
    },
    onError: (error: unknown) => {
      const fieldErrors = (error as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fieldErrors) {
        setErrors(fieldErrors);
        toast.error("Revisa los campos marcados.");
        return;
      }
      setErrors({});
      toast.error(
        friendlyError(error, "No pudimos guardar tu información. Verifica los datos e inténtalo nuevamente."),
      );
    },
  });

  if (!account) return <LoadingScreen />;

  const progress = step === "role" ? 33 : role === "professional" ? 66 : 66;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-gradient-brand pb-10 pt-6 text-primary-foreground">
        <div className="app-container">
          {step === "profile" && !initialRole ? (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setStep("role")}
            >
              <ArrowLeft aria-hidden /> Atrás
            </Button>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
            Paso {step === "role" ? "1" : "2"} de 2
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {step === "role" ? "¿Cómo vas a usar ServiGo?" : "Completa tu perfil"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/75">
            {step === "role"
              ? "Puedes contratar profesionales o ofrecer tus servicios."
              : "Esta información nos ayuda a conectarte con las personas correctas."}
          </p>
          <Progress value={progress} className="mt-4 h-1.5 bg-primary-foreground/20" />
        </div>
      </header>

      <main className="app-container -mt-6 flex-1 pb-10">
        {step === "role" ? (
          <div className="space-y-3">
            <RoleOption
              icon={UserRound}
              title="Soy cliente"
              description="Quiero encontrar y contratar profesionales de confianza."
              selected={role === "client"}
              onSelect={() => setRole("client")}
            />
            <RoleOption
              icon={Briefcase}
              title="Soy profesional"
              description="Quiero ofrecer mis servicios y recibir solicitudes."
              selected={role === "professional"}
              onSelect={() => setRole("professional")}
            />
            <Button
              variant="action"
              size="lg"
              className="w-full"
              disabled={!role || assignRole.isPending}
              onClick={() => role && assignRole.mutate(role)}
            >
              {assignRole.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Continuar
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Tu tipo de cuenta se define una sola vez y no se puede cambiar desde la app.
            </p>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile.mutate(new FormData(event.currentTarget));
            }}
          >
            <Card className="shadow-card">
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <AvatarPicker
                    userId={account.userId}
                    value={avatarPath}
                    onChange={setAvatarPath}
                    fallbackText={account.email ?? "U"}
                    required={role === "professional"}
                  />
                  <FieldError message={errors['avatar']} />
                </div>

                <Field
                  name="full_name"
                  label="Nombre completo"
                  placeholder="Ej. María Pérez"
                  defaultValue={account.profile?.full_name ?? ""}
                  error={errors['full_name']}
                  autoComplete="name"
                />
                <Field
                  name="phone"
                  label="Teléfono"
                  placeholder="Ej. 0991234567"
                  defaultValue={account.profilePrivate?.phone ?? ""}
                  error={errors['phone']}
                  autoComplete="tel"
                  hint="Solo se comparte cuando exista un servicio activo."
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    name="approximate_city"
                    label="Ciudad"
                    placeholder="Ej. Quito"
                    defaultValue={account.profile?.approximate_city ?? ""}
                    error={errors['approximate_city']}
                  />
                  <Field
                    name="approximate_sector"
                    label="Sector"
                    placeholder="Ej. La Carolina"
                    defaultValue={account.profile?.approximate_sector ?? ""}
                    error={errors['approximate_sector']}
                  />
                </div>

                {role === "professional" ? (
                  <>
                    <div className="border-t border-border pt-5">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Información profesional
                      </h2>
                    </div>

                    <Field
                      name="profession"
                      label="Profesión"
                      placeholder="Ej. Electricista residencial"
                      defaultValue={account.professionalProfile?.profession ?? ""}
                      error={errors['profession']}
                    />

                    <div className="space-y-2">
                      <Label>Especialidades</Label>
                      {specialties.isPending ? (
                        <p className="text-sm text-muted-foreground">Cargando especialidades…</p>
                      ) : specialties.isError ? (
                        <ErrorState
                          title="No pudimos cargar las especialidades"
                          description="Inténtalo nuevamente en un momento."
                          onRetry={() => void specialties.refetch()}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(specialties.data ?? []).map((specialty) => {
                            const active = selectedSpecialties.includes(specialty.id);
                            return (
                              <button
                                key={specialty.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  setSelectedSpecialties((current) =>
                                    current.includes(specialty.id)
                                      ? current.filter((id) => id !== specialty.id)
                                      : [...current, specialty.id],
                                  )
                                }
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                                  active
                                    ? "border-action bg-action text-action-foreground"
                                    : "border-border bg-card text-foreground hover:bg-accent",
                                )}
                              >
                                {specialty.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <FieldError message={errors['specialty_ids']} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción profesional</Label>
                      <Textarea
                        id="description"
                        name="description"
                        rows={4}
                        placeholder="Cuenta tu experiencia, el tipo de trabajos que realizas y por qué deberían elegirte."
                        defaultValue={account.professionalProfile?.description ?? ""}
                      />
                      <FieldError message={errors['description']} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        name="years_experience"
                        label="Años de experiencia"
                        type="number"
                        min={0}
                        placeholder="5"
                        defaultValue={String(account.professionalProfile?.years_experience ?? "")}
                        error={errors['years_experience']}
                      />
                      <Field
                        name="coverage_radius"
                        label="Radio de cobertura (km)"
                        type="number"
                        min={1}
                        placeholder="10"
                        defaultValue={String(account.professionalProfile?.coverage_radius ?? "")}
                        error={errors['coverage_radius']}
                      />
                      <Field
                        name="base_rate"
                        label="Tarifa base (USD)"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="15.00"
                        defaultValue={String(account.professionalProfile?.base_rate ?? "")}
                        error={errors['base_rate']}
                      />
                      <Field
                        name="hourly_rate"
                        label="Tarifa por hora (USD)"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="20.00"
                        defaultValue={String(account.professionalProfile?.hourly_rate ?? "")}
                        error={errors['hourly_rate']}
                      />
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-warning-soft p-3">
                      <BadgeCheck className="mt-0.5 size-4 text-warning-foreground" aria-hidden />
                      <p className="text-xs text-warning-foreground">
                        Tu perfil quedará en revisión. La verificación la realiza nuestro equipo.
                      </p>
                    </div>
                  </>
                ) : null}

                <Button
                  type="submit"
                  variant="action"
                  size="lg"
                  className="w-full"
                  disabled={saveProfile.isPending}
                >
                  {saveProfile.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  Finalizar registro
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}

async function savePublicProfile(
  userId: string,
  values: BaseProfileValues,
  avatarPath: string | null,
  activeRole: SelectableRole,
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: values.full_name,
      avatar_url: avatarPath,
      active_role: activeRole,
      approximate_city: values.approximate_city,
      approximate_sector: values.approximate_sector,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function savePrivateProfile(userId: string, phone: string) {
  const { error } = await supabase
    .from("profile_private")
    .upsert({ user_id: userId, phone }, { onConflict: "user_id" });
  if (error) throw error;
}

function flattenErrors(issues: { path: (string | number)[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function RoleOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border bg-card p-4 text-left shadow-card transition-all",
        selected ? "border-action ring-2 ring-action/25" : "border-border hover:border-action/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            selected ? "bg-action text-action-foreground" : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">{title}</h2>
            {selected ? <Badge variant="success">Seleccionado</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function Field({
  name,
  label,
  error,
  hint,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string | undefined;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={Boolean(error)} {...inputProps} />
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}
