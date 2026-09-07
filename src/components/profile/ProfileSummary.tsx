import { BadgeCheck, Clock, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Account, resolveAvatarUrl } from "@/lib/account";

export function ProfileSummary({ account }: { account: Account }) {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resolveAvatarUrl(account.profile?.avatar_url).then((url) => {
      if (active) setAvatar(url);
    });
    return () => {
      active = false;
    };
  }, [account.profile?.avatar_url]);

  const pro = account.professionalProfile;
  const verification = pro?.verification_status;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-border">
              {avatar ? <AvatarImage src={avatar} alt="Tu foto de perfil" /> : null}
              <AvatarFallback className="bg-primary-soft font-semibold text-primary">
                {(account.profile?.full_name ?? account.email ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {account.profile?.full_name || "Sin nombre"}
              </h2>
              <p className="truncate text-sm text-muted-foreground">{account.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="info">
                  {account.activeRole === "professional" ? "Profesional" : "Cliente"}
                </Badge>
                {verification === "verified" ? (
                  <Badge variant="success">
                    <BadgeCheck className="mr-1 size-3" aria-hidden /> Verificado
                  </Badge>
                ) : verification === "pending" ? (
                  <Badge variant="warning">
                    <Clock className="mr-1 size-3" aria-hidden /> En revisión
                  </Badge>
                ) : verification === "rejected" ? (
                  <Badge variant="destructive">Verificación rechazada</Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="space-y-3 pt-6">
          <Row
            icon={<MapPin className="size-4" aria-hidden />}
            label="Zona"
            value={
              account.profile?.approximate_city
                ? `${account.profile.approximate_sector ?? ""}${
                    account.profile.approximate_sector ? ", " : ""
                  }${account.profile.approximate_city}`
                : "Sin registrar"
            }
          />
          <Row
            icon={<Phone className="size-4" aria-hidden />}
            label="Teléfono"
            value={account.profilePrivate?.phone ?? "Sin registrar"}
          />
          <div className="flex items-start gap-2 rounded-xl bg-muted p-3">
            <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Tu teléfono y tu ubicación exacta son privados: nadie más puede verlos.
            </p>
          </div>
        </CardContent>
      </Card>

      {pro ? (
        <Card className="shadow-card">
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Información profesional
            </h3>
            <Row label="Profesión" value={pro.profession || "Sin registrar"} />
            <Row label="Experiencia" value={`${pro.years_experience} año(s)`} />
            <Row label="Tarifa base" value={`$${Number(pro.base_rate).toFixed(2)}`} />
            <Row label="Tarifa por hora" value={`$${Number(pro.hourly_rate).toFixed(2)}`} />
            <Row label="Radio de cobertura" value={`${pro.coverage_radius} km`} />
            <Row
              icon={<Star className="size-4" aria-hidden />}
              label="Calificación"
              value={
                pro.completed_services > 0
                  ? `${Number(pro.average_rating).toFixed(1)} · ${pro.completed_services} servicios`
                  : "Aún sin calificaciones"
              }
            />
            {pro.description ? (
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                {pro.description}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
