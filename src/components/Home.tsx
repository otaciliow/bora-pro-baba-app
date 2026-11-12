import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Trophy,
  Link2,
  UserPlus,
  MapPin,
  Clock,
  Coins,
  Check,
  Users,
  Timer,
  Goal,
  ShieldHalf,
  Zap,
  Dices,
  Wallet,
  ShieldCheck,
  Loader,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PlayerGroup = "Goleiros" | "Defensores" | "Meias" | "Atacantes";
type PlayerPosition = "Goleiro" | "Defensor" | "Meia" | "Atacante";

const POSITION_TO_GROUP: Record<string, PlayerGroup> = {
  goalkeeper: "Goleiros",
  defender: "Defensores",
  midfielder: "Meias",
  forward: "Atacantes",
}

const POSITION_TO_PLAYER: Record<string, PlayerPosition> = {
  goalkeeper: "Goleiro",
  defender: "Defensor",
  midfielder: "Meia",
  forward: "Atacante",
}

const GROUP_ORDER : PlayerGroup[] = ["Goleiros", "Defensores", "Meias", "Atacantes"];

const GROUP_ICONS: Record<PlayerGroup, React.ReactNode> = {
  Goleiros: <Goal className="h-4 w-4" />,
  Defensores: <ShieldHalf className="h-4 w-4" />,
  Meias: <Zap className="h-4 w-4" />,
  Atacantes: <Timer className="h-4 w-4" />,
};

export default function Home() {
  const { user, profile, membership, signOut } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: nextMatch, isLoading: matchLoading } = useQuery({
    queryKey: ["next-match", membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("is_open", true)
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: participants } = useQuery({
    queryKey: ["match-participants", nextMatch?.id],
    queryFn: async () => {
      if (!nextMatch?.id) return { presences: [], guests: [] };
      
      const { data: presences, error: pError } = await supabase
        .from("match_presences")
        .select(`*, profiles(id, name, primary_position, rating)`)
        .eq("match_id", nextMatch.id);

      if (pError) throw pError;

      const { data: guests, error: gError } = await supabase
        .from("match_guests")
        .select(`*, profiles:invited_by(name)`)
        .eq("match_id", nextMatch.id)
        .eq("status", "approved");

      if (gError) throw gError;

      return { presences: presences || [], guests: guests || [] };
    },
    enabled: !!nextMatch?.id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (confirming: boolean) => {
      if (!nextMatch || !user) return;
      if (confirming) {
        const { error } = await supabase
          .from("match_presences")
          .insert({match_id: nextMatch.id, user_id: user.id});

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("match_presences")
          .delete()
          .eq("match_id", nextMatch.id)
          .eq("user_id", user.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, confirming) => {
      queryClient.invalidateQueries({ queryKey: ["match-participants"] });
      toast.success(confirming ? "Presença confirmada! ⚽" : "Presença cancelada.")
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar presença: ${err.message}`);
    },
  });

  const isConfirmed = participants?.presences.some((p: any) => p.user_id === user?.id);

  const isChecking = isLoadingRole;
  const isAdmin = userRole?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <Header
        babaName={group?.name ?? "Bora pro Baba"}
        profile={profile}
        isChecking={isChecking}
        isAdmin={isAdmin}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <NextMatchCard match={nextMatch} loading={matchLoading} isConfirmed={!!isConfirmed} matchId={nextMatch?.id} userId={user?.id} onToggleRsvp={(val) => rsvpMutation.mutate(val)} isSubmitting={rsvpMutation.isPending} />
        <AttendanceList participants={participants} maxSlots={group?.max_confirmed ?? 24} currentUserId={user?.id} currentUserName={profile?.name} />
      </main>
    </div>
  );
}

function Header({
  babaName,
  profile,
  isChecking,
  isAdmin,
  onSignOut
}: {
  babaName: string;
  profile: any;
  isChecking: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const initials = profile?.name ? profile.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "BPB";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="hidden font-display text-3xl leading-none tracking-wide sm:block">
            {babaName}
          </span>
        </div>

        <Button
          asChild
          variant="outline"
          className="gap-2 font-display text-lg tracking-wide text-secondary"
        >
          <Link to="/sorteio">
            <Dices className="h-4 w-4" />
            Sorteio de Times
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="gap-2 font-display text-lg tracking-wide text-primary"
        >
          <Link to="/financeiro">
            <Wallet className="h-4 w-4" />
            Financeiro
          </Link>
        </Button>

        {(!isChecking && isAdmin) && (
          <Button
            asChild
            variant="outline"
            className="gap-2 font-display text-lg tracking-wide text-primary"
          >
            <Link to="/admin">
              <ShieldCheck className="h-4 w-4" />
              Diretoria
            </Link>
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3 rounded-2xl border border-border bg-card py-2 pl-2 pr-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary/15 font-display text-lg tracking-wide text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{profile?.name ?? "Atleta"}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {POSITION_TO_PLAYER[profile?.primary_position] ?? "Coringa"} / Nota {profile?.rating ?? "5.0"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, live: diff > 0 };
}

function NextMatchCard({
  match,
  loading,
  isConfirmed,
  matchId,
  userId,
  onToggleRsvp,
  isSubmitting
}: {
  match: any;
  loading: boolean;
  isConfirmed?: boolean;
  matchId?: string | undefined;
  userId?: string | undefined
  onToggleRsvp: (val: boolean) => void;
  isSubmitting?: boolean;
}) {
  const matchDate = useMemo(() => (match?.match_date ? new Date(match.match_date.replace("+00:00", "")) : new Date()), [match?.match_date]);
  const { days, hours, minutes, seconds, live } = useCountdown(matchDate);

  if (loading) {
    return (
      <Card className="flex gap-3 items-center p-6 justify-center text-muted-foreground" >
        Buscando próxima partida...
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </Card>
    )
  }

  if (!match) {
    return (
      <Card className="p-8 text-center">
        <h3 className="font-display text-2xl">Nenhuma partida aberta no momento</h3>
        <p className="text-sm text-muted-foreground mt-1">Aguarde a diretoria agendar o próximo baba.</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-2 border-primary/30">
      <div className="h-1 w-full bg-linear-to-r from-primary via-secondary to-primary" />
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardDescription className="font-medium uppercase tracking-widest text-secondary">
              Próxima Partida
            </CardDescription>
            <CardTitle className="mt-1 font-display text-4xl tracking-wide">
              {matchDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </CardTitle>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Faltam
            </p>
            <div className="flex items-center gap-1.5 font-display text-3xl leading-none text-primary">
              {days > 0 && (
                <>
                  <span>{days}d</span>
                  <span className="text-muted-foreground/50">:</span>
                </>
              )}
              <span>{String(hours).padStart(2, "0")}</span>
              <span className="text-muted-foreground/50">:</span>
              <span>{String(minutes).padStart(2, "0")}</span>
              <span className="text-muted-foreground/50">:</span>
              <span className={live ? "text-secondary" : ""}>{String(seconds).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoChip icon={<Clock className="h-4 w-4" />} label="Horário" value={matchDate.toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
          <InfoChip
            icon={<MapPin className="h-4 w-4" />}
            label="Local"
            value={match.location ?? "Campo Principal"}
          />
          <InfoChip icon={<UserPlus className="h-4 w-4" />} label="Convidar visitantes" value="Confirme presença para ver o link" isInvite={true} matchId={matchId} userId={userId} isConfirmed={isConfirmed} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            variant={isConfirmed ? "secondary" : "default"}
            className="flex-1 font-display text-2xl tracking-wide"
            onClick={() => onToggleRsvp(!isConfirmed)}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                {isConfirmed ? "Cancelando..." : "Confirmando..."}
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                {isConfirmed ? "Presença confirmada! Clique novamente para cancelar" : "Bora pro Baba!"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoChip({ 
    icon, 
    label, 
    value, 
    isInvite, 
    matchId, 
    userId,
    isConfirmed, 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value?: string; 
    isInvite?:boolean; 
    matchId?: string | undefined; 
    userId?: string | undefined; 
    isConfirmed?: boolean | undefined;
  }) {

  const generate = async () => {
    if (!matchId || !userId) return;

    const { data, error } = await supabase
      .from("guest_invites")
      .insert({ 
        match_id: matchId,
        created_by: userId,
       })
      .select("token")
      .single()

    if (error || !data) {
      toast.error("Erro ao gerar link de convite.");
      return;
    }

    const url = `${window.location.origin}/convite/${data.token}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Mande para os visitantes.");
    } catch {
      toast.success("Link gerado com sucesso!");
    }
  };

  const linkAllowed = isInvite && isConfirmed

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 ${linkAllowed && 'cursor-pointer'}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        { linkAllowed ? (
          <p className="text-sm font-semibold flex gap-1 items-center" onClick={generate}>
            <Link2 className="h-4 w-4" /><span>Clique para copiar link de convite</span>
          </p>
        ) : (
          <p className="text-sm font-semibold">{value}</p>
        )}
      </div>
    </div>
  );
}

function AttendanceList({
  participants,
  maxSlots,
  currentUserId,
  currentUserName,
}: {
  participants: any;
  maxSlots: number;
  currentUserId?: string | null | undefined;
  currentUserName?: string | null | undefined;
}) {
  const presences = participants?.presences || [];
  const guests = participants?.guests || [];
  const allPlayers = useMemo(() => {
    const list: any[] = [];

    presences.forEach((p: any) => {
      const pos = p.profiles?.primary_position || "midfielder";
      list.push({
        id: p.user_id,
        name: p.profiles?.name || "Atleta",
        group: POSITION_TO_GROUP[pos] || "Meias",
        rating: p.profiles?.rating || 5.0,
        confirmed: true,
        isMe: p.user_id === currentUserId,
        type: "Mensalista",
      });
    });

    guests.forEach((g: any) => {
      const pos = g.position || "midfielder";
      list.push({
        id: g.id,
        name: g.name,
        group: POSITION_TO_GROUP[pos] || "Meias",
        rating: g.rating || 5.0,
        confirmed: true,
        invitedBy:g.profiles?.name || "Verificar no WhatsApp",
        type: "Visitante",
      });
    });

    return list;
  }, [presences, guests, currentUserId])
  const confirmedCount = allPlayers.length;
  const pct = Math.min(100, Math.round((confirmedCount / maxSlots) * 100));

  const byGroup = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      group: g,
      players: allPlayers.filter((p) => p.group === g),
    }));
  }, [allPlayers]);

  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-3xl tracking-wide">
                <Users className="h-6 w-6 text-primary" />
                Quem Cola
              </CardTitle>
              <CardDescription>Lista de presença do próximo baba</CardDescription>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl leading-none text-primary">
                {confirmedCount}
                <span className="text-muted-foreground">/{maxSlots}</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                confirmados
              </p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <Progress value={pct} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              {maxSlots - confirmedCount > 0
                ? `Ainda cabem ${maxSlots - confirmedCount} atletas — chama a galera!`
                : "Baba lotado! ⚽"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {byGroup.map(({ group, players }) => (
            <div key={group}>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                  {GROUP_ICONS[group]}
                </span>
                <h3 className="font-display text-xl tracking-wide">{group}</h3>
                <span className="text-xs text-muted-foreground">
                  ({players.length})
                </span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-border">
                {players.length === 0 ? (
                  <li className="px-3.5 py-3 text-xs text-muted-foreground bg-card">Nenhum atleta confirmado nesta posição</li>
                ) : (
                  players.map((p, i) => (
                    <li
                      key={p.id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 ${i % 2 ? "bg-card/60" : "bg-card"}`}
                    >
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-muted font-display text-sm tracking-wide">
                          {p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`text-sm ${p.isMe ? "font-bold text-primary" : "font-medium"}`}>
                        {p.name}
                        {p.isMe && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-secondary">você</span>}
                      </span>
                      <div className="ml-auto flex items-center gap-4">
                        {p.invitedBy ? (
                          <Popover>
                            <PopoverTrigger>
                              <Badge variant="outline" className="border-secondary/40 text-secondary cursor-pointer">Visitante</Badge>
                            </PopoverTrigger>
                            <PopoverContent className="p-3 text-xs">Convidado por {p.invitedBy}</PopoverContent>
                          </Popover>
                        ) : (
                          <Badge variant="outline" className="border-primary/40 text-primary">Mensalista</Badge>
                        )}
                        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          Nota {Number(p.rating).toFixed(1)}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
