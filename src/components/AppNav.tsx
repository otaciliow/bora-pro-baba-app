import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Dices, Wallet, ShieldCheck, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const ITEMS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/sorteio", label: "Sorteio", icon: Dices },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin", label: "Diretoria", icon: ShieldCheck },
] as const;

const currentSeason = new Date().toLocaleDateString("pt-BR", { year: "numeric" })

export function AppSidebar() {
  const { user } = useAuth();

  const { data: group } = useQuery({
    queryKey: ["user-group-rpc", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.rpc as any)("get_user_group");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <span className="font-display text-2xl tracking-wide" style={{ fontFamily: "Bebas Neue" }}>
          {group?.name || "Bora pro Baba"}
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-primary/15 !text-primary" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-border px-4 py-4">
        <UserChip />
        <p className="mt-3 text-xs text-center text-muted-foreground">{group?.name || "Bora pro Baba"} · Temporada {currentSeason}</p>
      </div>
    </aside>
  );
}

function useLogout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };
}

function UserChip() {
  const { user, profile } = useAuth();
  const logout = useLogout();

  if (!user) return null;

  const name = profile?.name ?? "Atleta Base"
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-9 w-9 items-center gap-2">
        <AvatarFallback className="bg-primary/15 font-display text-xs tracking-wide text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
      <Button size="sm" variant="ghost" onClick={logout} aria-label="Sair">
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  );
}

export function MobileTopBar() {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-2 backdrop-blur md:hidden">
      <UserChip />
    </div>
  );
}

export function MobileBottomBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
          activeProps={{ className: "!text-primary" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
