import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Home, LogOut, User } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/account";
import { cn } from "@/lib/utils";

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="bg-gradient-brand pb-8 pt-6 text-primary-foreground">
      <div className="app-container flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-primary-foreground/75">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}

type NavItem = { to: string; label: string; icon: typeof Home };

export function BottomNav({ role }: { role: AppRole }) {
  const items: NavItem[] =
    role === "professional"
      ? [
          { to: "/professional", label: "Inicio", icon: Briefcase },
          { to: "/professional/perfil", label: "Perfil", icon: User },
        ]
      : [
          { to: "/client", label: "Inicio", icon: Home },
          { to: "/client/perfil", label: "Perfil", icon: User },
        ];

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="app-container flex items-stretch justify-around py-1.5">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-action" }}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const signOut = useSignOut();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("text-primary-foreground hover:bg-primary-foreground/10", className)}
      onClick={() => void signOut()}
    >
      <LogOut aria-hidden />
      Salir
    </Button>
  );
}

export function AppScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-surface">{children}</div>;
}

export function AppContent({ children }: { children: ReactNode }) {
  return (
    <main className="app-container -mt-5 flex-1 space-y-4 pb-8">
      {children}
    </main>
  );
}
