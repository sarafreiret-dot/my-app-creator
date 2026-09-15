import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { friendlyError } from "@/lib/friendly-errors";

type Values = {
  full_name: string;
  phone: string;
  approximate_city: string;
  approximate_sector: string;
  profession: string;
  description: string;
  years_experience: string;
  base_rate: string;
  hourly_rate: string;
  coverage_radius: string;
};

type Props = {
  account: Account;
  onDone: () => void;
  onCancel: () => void;
};

export function ProfileEditForm({ account, onDone, onCancel }: Props) {
  const pro = account.professionalProfile;
  const isPro = Boolean(pro);
  const [avatarPath, setAvatarPath] = useState<string | null>(
    account.profile?.avatar_url ?? null,
  );
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      full_name: account.profile?.full_name ?? "",
      phone: account.profilePrivate?.phone ?? "",
      approximate_city: account.profile?.approximate_city ?? "",
      approximate_sector: account.profile?.approximate_sector ?? "",
      profession: pro?.profession ?? "",
      description: pro?.description ?? "",
      years_experience: String(pro?.years_experience ?? 0),
      base_rate: String(pro?.base_rate ?? 0),
      hourly_rate: String(pro?.hourly_rate ?? 0),
      coverage_radius: String(pro?.coverage_radius ?? 5),
    },
  });

  async function onSubmit(values: Values) {
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name.trim(),
          avatar_url: avatarPath,
          approximate_city: values.approximate_city.trim(),
          approximate_sector: values.approximate_sector.trim(),
        })
        .eq("id", account.userId);
      if (profileError) throw profileError;

      const { error: privateError } = await supabase
        .from("profile_private")
        .upsert(
          { user_id: account.userId, phone: values.phone.trim() },
          { onConflict: "user_id" },
        );
      if (privateError) throw privateError;

      if (isPro) {
        const { error: proError } = await supabase
          .from("professional_profiles")
          .update({
            profession: values.profession.trim(),
            description: values.description.trim(),
            years_experience: Number(values.years_experience),
            base_rate: Number(values.base_rate),
            hourly_rate: Number(values.hourly_rate),
            coverage_radius: Number(values.coverage_radius),
          })
          .eq("user_id", account.userId);
        if (proError) throw proError;
      }

      toast.success("Perfil actualizado.");
      onDone();
    } catch (error) {
      toast.error(friendlyError(error, "No pudimos guardar tus cambios."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <AvatarPicker
            userId={account.userId}
            value={avatarPath}
            onChange={setAvatarPath}
            fallbackText={account.profile?.full_name ?? account.email ?? "?"}
            required={isPro}
          />

          <Field label="Nombre completo" error={errors['full_name']?.message}>
            <Input
              {...register("full_name", {
                required: "Ingresa tu nombre completo.",
                minLength: { value: 2, message: "El nombre es demasiado corto." },
                maxLength: { value: 120, message: "El nombre es demasiado largo." },
              })}
            />
          </Field>

          <Field
            label="Teléfono"
            hint="Solo se comparte cuando exista un servicio activo."
            error={errors['phone']?.message}
          >
            <Input
              inputMode="tel"
              {...register("phone", {
                required: "Ingresa un teléfono válido.",
                pattern: {
                  value: /^[0-9+\s()-]{7,25}$/,
                  message: "Usa solo números y los símbolos + ( ) -",
                },
              })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" error={errors['approximate_city']?.message}>
              <Input {...register("approximate_city", { required: "Ingresa tu ciudad." })} />
            </Field>
            <Field label="Sector" error={errors['approximate_sector']?.message}>
              <Input {...register("approximate_sector", { required: "Ingresa tu sector." })} />
            </Field>
          </div>

          {isPro ? (
            <>
              <Field label="Profesión" error={errors['profession']?.message}>
                <Input {...register("profession", { required: "Ingresa tu profesión." })} />
              </Field>
              <Field label="Sobre tu trabajo" error={errors['description']?.message}>
                <Textarea
                  rows={4}
                  {...register("description", {
                    required: "Cuéntanos sobre tu trabajo.",
                    minLength: { value: 30, message: "Escribe al menos 30 caracteres." },
                    maxLength: { value: 1000, message: "Máximo 1000 caracteres." },
                  })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Años de experiencia" error={errors['years_experience']?.message}>
                  <Input type="number" min={0} max={70} {...register("years_experience")} />
                </Field>
                <Field label="Radio de cobertura (km)" error={errors['coverage_radius']?.message}>
                  <Input type="number" min={1} max={100} {...register("coverage_radius")} />
                </Field>
                <Field label="Tarifa base ($)" error={errors['base_rate']?.message}>
                  <Input type="number" min={0} step="0.01" {...register("base_rate")} />
                </Field>
                <Field label="Tarifa por hora ($)" error={errors['hourly_rate']?.message}>
                  <Input type="number" min={0} step="0.01" {...register("hourly_rate")} />
                </Field>
              </div>
            </>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="action" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Guardar cambios
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
