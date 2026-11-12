import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ClipboardCopy,
  Dices,
  Goal,
  RotateCcw,
  Scale,
  Trophy,
  Users,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============= Dados mockados =============

type Pos = "Goleiro" | "Defensor" | "Meia" | "Atacante" | "Linha" | string;

type Player = {
  name: string;
  pos: Pos;
  rating: number;
  guest?: boolean;
};

const TEAM_LETTERS = ["A", "B", "C", "D"];

const TEAM_THEMES = [
  {
    border: "border-primary/40",
    text: "text-primary",
    soft: "bg-primary/10",
    chip: "bg-primary/15 text-primary",
    dot: "bg-primary",
  },
  {
    border: "border-secondary/40",
    text: "text-secondary",
    soft: "bg-secondary/10",
    chip: "bg-secondary/15 text-secondary",
    dot: "bg-secondary",
  },
  {
    border: "border-chart-2/40",
    text: "text-chart-2",
    soft: "bg-chart-2/10",
    chip: "bg-chart-2/15 text-chart-2",
    dot: "bg-chart-2",
  },
  {
    border: "border-chart-1/40",
    text: "text-chart-1",
    soft: "bg-chart-1/10",
    chip: "bg-chart-1/15 text-chart-1",
    dot: "bg-chart-1",
  },
];

const TEAM_COUNTS = [2, 3, 4];
const PER_TEAM_OPTIONS = [5, 6, 7, 8, 9];

// ============= Lógica do sorteio =============

type Team = {
  letter: string;
  players: Player[];
  avg: number;
};

function drawTeams(teamCount: number, perTeam: number, all: Player[]): Team[] {
  const capacity = teamCount * perTeam;
  const pool = all.slice(0, capacity);

  const teams: { players: Player[] }[] = Array.from({ length: teamCount }, () => ({
    players: [] as Player[],
  }));

  // 1. Garante um goleiro em cada time quando possível.
  const keepers = pool.filter((p) => p.pos === "Goleiro");
  keepers.forEach((k, i) => {
    const team = teams[i % teamCount];
    if (team && team.players.length < perTeam) team.players.push(k);
  });

  // 2. Rascunho invertido (snake) dos demais, sempre para o time com a menor média.
  const others = pool
    .filter((p) => p.pos !== "Goleiro")
    .map((p) => ({ player: p, key: p.rating + Math.random() * 0.9 }))
    .sort((a, b) => b.key - a.key);

  for (const { player } of others) {
    let target: { players: Player[] } | null = null;
    let targetAvg = 0;
    for (const t of teams) {
      if (t.players.length >= perTeam) continue;
      const avg = t.players.length
        ? t.players.reduce((s, p) => s + p.rating, 0) / t.players.length
        : 0;
      if (
        target === null ||
        t.players.length < target.players.length ||
        (t.players.length === target.players.length && avg < targetAvg)
      ) {
        target = t;
        targetAvg = avg;
      }
    }
    if (!target) break;
    target.players.push(player);
  }

  return teams.map((t, i) => {
    const players = [...t.players].sort((a, b) => {
      if (a.pos !== b.pos) return a.pos === "Goleiro" ? -1 : 1;
      return b.rating - a.rating;
    });
    const avg = players.length
      ? players.reduce((s, p) => s + p.rating, 0) / players.length
      : 0;
    return { letter: TEAM_LETTERS[i] ?? String.fromCharCode(65 + i), players, avg };
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard indisponível");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ============= Componente =============

export default function DrawTeams() {
  const { user } = useAuth();
  const [teamCount, setTeamCount] = useState(2);
  const [perTeam, setPerTeam] = useState(6);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [sorting, setSorting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const { data: nextMatch } = useQuery({
    queryKey: ["next-match-sorteio"],
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
    queryKey: ["match-participants-sorteio", nextMatch?.id],
    queryFn: async () => {
      if (!nextMatch?.id) return { presences: [], guests: [] };

      const { data: presences, error: pError } = await supabase
        .from("match_presences")
        .select(`*, profiles(id, name, primary_position, rating)`)
        .eq("match_id", nextMatch.id);

      if (pError) throw pError;

      const { data: guests, error: gError } = await supabase
        .from("match_guests")
        .select("*")
        .eq("match_id", nextMatch.id)
        .eq("status", "approved");

      if (gError) throw gError;

      return { presences: presences || [], guests: guests || [] };
    },
    enabled: !!nextMatch?.id,
  });

  const { data: group } = useQuery({
      queryKey: ["user-group-draw", user?.id],
      queryFn: async () => {
        if (!user?.id) return null;
        const { data, error } = await (supabase.rpc as any)("get_user_group");
        if (error) throw error;
        return data || null;
      },
      enabled: !!user?.id,
    });

    function parsePosition(dbPos?: string): Pos {
      switch (dbPos) {
        case "goalkeeper":
          return "Goleiro";
        
        case "defender":
          return "Defensor";

        case "midfielder":
          return "Meia";

        case "forward":
          return "Atacante";

        default:
          return (dbPos as Pos) || "Linha";
      }
    }

  const players = useMemo<Player[]>(() => {
    const list: Player[] = [];

    participants?.presences.forEach((p: any) => {
      list.push({
        name: p.profiles?.name || "Atleta",
        pos: parsePosition(p.profiles?.primary_position),
        rating: Number(p.profiles?.rating) || 5.0,
        guest: false,
      });
    });

    participants?.guests.forEach((g: any) => {
      list.push({
        name: g.name,
        pos: parsePosition(g.position),
        rating: Number(g.rating) || 5.0,
        guest: true,
      });
    });

    return list;
  }, [participants]);

  const slots = teamCount * perTeam;
  const shortBy = players.length - slots;

  const run = () => {
    setSorting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTeams(drawTeams(teamCount, perTeam, players));
      setSorting(false);
      toast.success("Baba sorteado! ⚽", {
        description: `${teamCount} times de ${perTeam} — confere o equilíbrio das médias.`,
      });
    }, 900);
  };

  const message = useMemo(() => {
    if (!teams) return "";
    const matchDateFormatted = nextMatch?.match_date ? new Date(nextMatch.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Próximo Baba";
    const lines: string[] = [];
    lines.push(`----- ⚽ ${(group?.name).toUpperCase()} — ESCALAÇÃO DO BABA -----`);
    lines.push(`📆 ${matchDateFormatted} · 📍 ${nextMatch?.location ?? "Campo Principal"}`);
    lines.push(`${teams.length} times de ${perTeam} · R$ 20,00 por atleta visitante`);
    lines.push("");
    teams.forEach((t, i) => {
      lines.push(`${TEAM_EMOJI[i % TEAM_EMOJI.length] ?? "⚽"} TIME ${t.letter} — média ${t.avg.toFixed(1)}`);
      t.players.forEach((p, idx) => {
        lines.push(`   ${idx + 1}. ${p.name} (${p.pos})${p.guest ? " [visitante]" : ""}`);
      });
      if (t.players.length < perTeam) {
        lines.push(`   ${"—".repeat(3)} vagas em aberto: ${perTeam - t.players.length}`);
      }
      lines.push("");
    });
    lines.push("Bora pro Baba! 🏆");
    return lines.join("\n");
  }, [teams, perTeam, nextMatch]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(message);
    if (ok) {
      toast.success("Escalação copiada!", {
        description: "Agora é só colar no grupo do WhatsApp.",
      });
    } else {
      toast.error("Não deu pra copiar sozinho", {
        description: "Seu navegador bloqueou a cópia — selecione o texto e copie manualmente.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <Link to="/" aria-label="Voltar para a tela inicial">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Trophy className="h-4.5 w-4.5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-2xl tracking-wide sm:text-3xl">
              Sorteio de <span className="text-primary">Times</span>
            </p>
            <p className="text-[11px] text-muted-foreground">{nextMatch ? new Date(nextMatch.match_date).toLocaleDateString("pt-BR", {weekday: "long", day: "2-digit", month: "long"}) : "Baba da Segunda"} · ${players.length} atletas na lista</p>
          </div>
          <Badge className="ml-auto hidden gap-1.5 border-transparent bg-secondary/15 text-secondary sm:flex">
            <Scale className="h-3.5 w-3.5" />
            Médias equilibradas
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-10">
        <ConfigPanel
          teamCount={teamCount}
          onTeamCount={setTeamCount}
          perTeam={perTeam}
          onPerTeam={setPerTeam}
          slots={slots}
          shortBy={shortBy}
          onDraw={run}
          sorting={sorting}
        />

        {teams && teams.length > 0 ? (
          <TeamGrid teams={teams} perTeam={perTeam} sorting={sorting} />
        ) : (
          <EmptyState sorting={sorting} />
        )}

        <ActionFooter
          disabled={!teams || sorting}
          onCopy={handleCopy}
          onRedo={run}
          perTeam={perTeam}
          teamCount={teamCount}
        />

        <p className="text-center text-xs text-muted-foreground">
          Sorteio baseado nos atletas confirmados para a próxima partida.
        </p>
      </main>
    </div>
  );
}

const TEAM_EMOJI = ["🟢", "🟡", "🔵", "🟠"];

// ============= Painel de configurações =============

function ConfigPanel({
  teamCount,
  onTeamCount,
  perTeam,
  onPerTeam,
  slots,
  shortBy,
  onDraw,
  sorting,
}: {
  teamCount: number;
  onTeamCount: (n: number) => void;
  perTeam: number;
  onPerTeam: (n: number) => void;
  slots: number;
  shortBy: number;
  onDraw: () => void;
  sorting: boolean;
}) {
  return (
    <Card className="border-2 border-primary/25">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-3xl tracking-wide">
          <Dices className="h-6 w-6 text-primary" />
          Painel de Configurações
        </CardTitle>
        <CardDescription>Escolhe como o baba de hoje vai ser dividido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Quantidade de times
            </p>
            <ToggleGroup
              type="single"
              value={String(teamCount)}
              onValueChange={(v) => v && onTeamCount(Number(v))}
              className="justify-between gap-2"
            >
              {TEAM_COUNTS.map((n) => (
                <ToggleGroupItem
                  key={n}
                  value={String(n)}
                  className="flex-1 gap-1.5 rounded-xl border border-border font-display text-xl tracking-wide data-[state=on]:border-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md data-[state=on]:shadow-primary/30"
                >
                  <Users className="h-4 w-4" />
                  {n} times
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Atletas por time
            </p>
            <Select value={String(perTeam)} onValueChange={(v) => onPerTeam(Number(v))}>
              <SelectTrigger className="h-12 rounded-xl border-border font-display text-xl tracking-wide">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PER_TEAM_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="font-medium">
                    {n} vs {n} <span className="text-muted-foreground">· {n * teamCount} vagas</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1.5 border-border py-1 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            {slots} vagas · {slots + shortBy} atletas na lista
          </Badge>
          {shortBy < 0 && (
            <Badge className="border-transparent bg-destructive/15 text-destructive">
              Faltam {Math.abs(shortBy)} atletas pra fechar
            </Badge>
          )}
          {shortBy >= 0 && shortBy <= 4 && (
            <Badge variant="outline" className="border-border text-muted-foreground">
              {shortBy} no banco de espera
            </Badge>
          )}
        </div>

        <Button
          size="lg"
          className="w-full gap-2.5 rounded-2xl bg-linear-to-r from-primary to-secondary py-7 font-display text-3xl tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
          onClick={onDraw}
          disabled={sorting}
        >
          <Dices className={`h-7 w-7 ${sorting ? "animate-spin" : ""}`} />
          {sorting ? "Sorteando o baba..." : "Sortear Baba"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============= Grid de times =============

function TeamGrid({
  teams,
  perTeam,
  sorting,
}: {
  teams: Team[];
  perTeam: number;
  sorting: boolean;
}) {
  const globalAvg = useMemo(() => {
    const all = teams.flatMap((t) => t.players);
    return all.length ? all.reduce((s, p) => s + p.rating, 0) / all.length : 0;
  }, [teams]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl tracking-wide">Times Sorteados</h2>
        <span className="text-xs text-muted-foreground">
          Média geral da lista: <span className="font-semibold text-foreground">{globalAvg.toFixed(1)}</span>
        </span>
      </div>

      <div
        className={`grid gap-4 transition-opacity duration-300 ${sorting ? "opacity-40" : "opacity-100"} ${
          teams.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {teams.map((team, i) => (
          <TeamCard key={team.letter} team={team} index={i} perTeam={perTeam} globalAvg={globalAvg} />
        ))}
      </div>
    </section>
  );
}

function TeamCard({
  team,
  index,
  perTeam,
  globalAvg,
}: {
  team: Team;
  index: number;
  perTeam: number;
  globalAvg: number;
}) {
  const theme = TEAM_THEMES[index % TEAM_THEMES.length] ?? TEAM_THEMES[0] ?? {
    border: "border-primary/40",
    text: "text-primary",
    soft: "bg-primary/10",
    chip: "bg-primary/15 text-primary",
    dot: "bg-primary",
  };
  const delta = team.avg - globalAvg;
  const balanced = Math.abs(delta) <= 0.15;

  return (
    <Card className={`flex flex-col gap-0 overflow-hidden border-2 ${theme.border} p-0`}>
      <div className={`h-1.5 w-full ${theme.dot}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className={`font-display text-4xl leading-none tracking-wide ${theme.text}`}>
              Time {team.letter}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {team.players.length}/{perTeam} atletas
            </CardDescription>
          </div>
          <div className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Média geral
            </p>
            <p className={`font-display text-3xl leading-none ${theme.text}`}>{team.avg.toFixed(1)}</p>
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className={`h-1.5 w-full overflow-hidden rounded-full ${theme.soft}`}>
            <div
              className={`h-full rounded-full ${theme.dot} transition-all duration-700`}
              style={{ width: `${Math.min(100, (team.avg / 10) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Badge className={`border-transparent text-[10px] font-bold uppercase tracking-wide ${theme.chip}`}>
              <Scale className="h-3 w-3" />
              {balanced ? "Equilibrado" : delta > 0 ? "Favorito" : "Zebra"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {delta === 0 ? "na média" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} da média`}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-1.5 pt-0">
        {team.players.map((p, idx) => (
          <div
            key={p.name}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5"
          >
            <span className="w-3.5 shrink-0 text-center text-[11px] font-bold text-muted-foreground">
              {idx + 1}
            </span>
            <span className="truncate text-[13px] font-medium">{p.name}</span>
            <span className={`shrink-0 rounded px-1 text-[9px] font-bold uppercase ${p.guest ? "bg-secondary/20 text-secondary" : "bg-primary/15 text-primary"}`}>
              {p.guest ? "Visitante" : "Mensalista"}
            </span>
            <Badge
              className={`ml-auto shrink-0 border-transparent px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide ${
                p.pos === "Goleiro" ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
              }`}
            >
              {p.pos === "Goleiro" && <Goal className="h-3 w-3" />}
              {p.pos}
            </Badge>
          </div>
        ))}
        {Array.from({ length: Math.max(0, perTeam - team.players.length) }).map((_, i) => (
          <div
            key={`open-${i}`}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs italic text-muted-foreground"
          >
            Vaga em aberto
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ sorting }: { sorting: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ${
            sorting ? "animate-pulse" : ""
          }`}
        >
          <Dices className={`h-8 w-8 ${sorting ? "animate-spin" : ""}`} />
        </span>
        <h2 className="font-display text-3xl tracking-wide">
          {sorting ? "Sorteando o baba..." : "Nada sorteado ainda"}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ajusta a quantidade de times e de atletas por time aí em cima e aperta{" "}
          <span className="font-semibold text-primary">Sortear Baba</span> pra ver a escalação aparecer.
        </p>
      </CardContent>
    </Card>
  );
}

// ============= Rodapé de ações =============

function ActionFooter({
  disabled,
  onCopy,
  onRedo,
  perTeam,
  teamCount,
}: {
  disabled: boolean;
  onCopy: () => void;
  onRedo: () => void;
  perTeam: number;
  teamCount: number;
}) {
  return (
    <Card className={`transition-opacity ${disabled ? "opacity-60" : ""}`}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground sm:mr-auto">
          {disabled
            ? "As ações liberam depois do primeiro sorteio."
            : `${teamCount} times de ${perTeam} · escalação pronta pro grupo`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="gap-2 font-display text-xl tracking-wide" onClick={onRedo} disabled={disabled}>
            <RotateCcw className="h-5 w-5" />
            Refazer Sorteio
          </Button>
          <Button
            size="lg"
            className="gap-2 font-display text-xl tracking-wide"
            onClick={onCopy}
            disabled={disabled}
          >
            <ClipboardCopy className="h-5 w-5" />
            Copiar Escalação pro WhatsApp
            <MessageCircle className="h-5 w-5 opacity-80" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}