// src/components/Header.tsx
import { Trophy, Dices, Wallet, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const POSITION_TO_PLAYER: Record<string, string> = {
  goalkeeper: "Goleiro",
  defender: "Defensor",
  midfielder: "Meia",
  forward: "Atacante",
};

export function DesktopHeader() {
  const { user, profile, signOut } = useAuth();

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

  const { data: userRole, isLoading: isLoadingRole } = useQuery({
    queryKey: ["admin-role-verification", group?.id, user?.id],
    queryFn: async () => {
      if (!group?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!group?.id && !!user?.id,
  });

  const isAdmin = !isLoadingRole && userRole?.role === "admin";
  const babaName = group?.name ?? "Bora pro Baba";
  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "BPB";

  return (
    <header className="sticky top-0 z-20 hidden border-b border-border bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
            {/* Identidade do Grupo (link para a Home) */}
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                <Trophy className="h-5 w-5" />
            </span>
            <span className="font-display text-3xl leading-none tracking-wide">
                {babaName}
            </span>
            </Link>

            {/* Navegação Principal */}
            <nav className="flex items-center gap-2">
            <Button
                asChild
                variant="outline"
                className="gap-2 font-display text-lg tracking-wide text-secondary [&.active]:border-secondary [&.active]:bg-secondary/10"
            >
                <Link to="/sorteio">
                <Dices className="h-4 w-4" />
                Sorteio de Times
                </Link>
            </Button>

            <Button
                asChild
                variant="outline"
                className="gap-2 font-display text-lg tracking-wide text-primary [&.active]:border-primary [&.active]:bg-primary/10"
            >
                <Link to="/financeiro">
                <Wallet className="h-4 w-4" />
                Financeiro
                </Link>
            </Button>

            {isAdmin && (
                <Button
                asChild
                variant="outline"
                className="gap-2 font-display text-lg tracking-wide text-primary [&.active]:border-primary [&.active]:bg-primary/10"
                >
                <Link to="/admin">
                    <ShieldCheck className="h-4 w-4" />
                    Diretoria
                </Link>
                </Button>
            )}
            </nav>
        </div>

        {/* Perfil e Logout */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card py-1.5 pl-2 pr-2.5">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/15 font-display text-base tracking-wide text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{profile?.name ?? "Atleta"}</p>
            <span className="block text-xs text-muted-foreground">
              {POSITION_TO_PLAYER[profile?.primary_position ?? ""] ?? "Coringa"} · Nota {Number(profile?.rating ?? 5).toFixed(1)}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={signOut}
            title="Sair"
            className="ml-1 h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}