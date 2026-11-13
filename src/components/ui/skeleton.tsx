import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 animate-pulse">
        <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4 animate-pulse">
        <div className="h-11 w-full bg-muted rounded-xl" />
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-muted rounded" />
            <div className="h-4 w-80 bg-muted rounded" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full bg-muted/40 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function DrawTeamsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-10 animate-pulse">
        {/* Esqueleto do painel de configuração */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-muted rounded" />
            <div className="h-4 w-80 bg-muted rounded" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-28 rounded-2xl border border-border/40 bg-muted/20 p-4" />
            <div className="h-28 rounded-2xl border border-border/40 bg-muted/20 p-4" />
          </div>
          <div className="h-14 w-full bg-muted rounded-2xl" />
        </div>

        {/* Esqueleto do estado vazio / área de sorteio */}
        <div className="rounded-xl border border-dashed border-border/60 p-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted" />
          <div className="space-y-2 text-center flex flex-col items-center">
            <div className="h-7 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted rounded" />
          </div>
        </div>

        {/* Esqueleto do rodapé de ações */}
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-4 w-52 bg-muted rounded" />
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="h-10 w-36 bg-muted rounded-lg flex-1" />
            <div className="h-10 w-48 bg-muted rounded-lg flex-1" />
          </div>
        </div>
      </main>
    </div>
  );
}

function FinanceSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-12 animate-pulse">
        {/* Esqueleto dos 3 StatCards superiores */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-6 w-28 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Esqueleto do PixCard */}
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted rounded" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-40 rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3" />
            <div className="h-40 rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3" />
          </div>
        </div>

        {/* Esqueleto do HistoryCard */}
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-7 w-56 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
            <div className="h-8 w-44 bg-muted rounded" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-12 w-full bg-muted/40 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 animate-pulse">
      
      {/* 1. Esqueleto do Card da Próxima Partida (NextMatchCard) */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-8 w-64 sm:w-80 bg-muted rounded-lg" />
          </div>
          {/* Caixa de contagem regressiva simulada */}
          <div className="h-16 w-28 bg-muted rounded-xl" />
        </div>
        
        {/* Chips de Informação (Horário, Local, Convidar) */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-14 bg-muted/60 rounded-xl" />
          <div className="h-14 bg-muted/60 rounded-xl" />
          <div className="h-14 bg-muted/60 rounded-xl" />
        </div>

        {/* Botão de Confirmação (Eu vou!) */}
        <div className="flex justify-center">
          <div className="h-12 w-full max-w-sm bg-muted rounded-lg" />
        </div>
      </div>

      {/* 2. Esqueleto da Lista de Presença (AttendanceList) */}
      <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6 shadow-sm">
        {/* Cabeçalho da Lista e Barra de Progresso */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-36 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
          <div className="h-10 w-16 bg-muted rounded-lg" />
        </div>
        
        <div className="space-y-2">
          <div className="h-2.5 w-full bg-muted rounded-full" />
          <div className="h-3 w-40 bg-muted rounded" />
        </div>

        {/* Simulação dos Grupos (Goleiros, Meias, etc.) */}
        {[1, 2].map((groupIndex) => (
          <div key={groupIndex} className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-muted rounded-md" />
              <div className="h-5 w-28 bg-muted rounded" />
            </div>
            
            {/* Lista de Atletas simulados */}
            <div className="rounded-xl border border-border/40 divide-y divide-border/40 overflow-hidden">
              {[1, 2, 3].map((playerIndex) => (
                <div key={playerIndex} className="flex items-center gap-3 px-3.5 py-3 bg-card">
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                  <div className="h-4 w-32 sm:w-48 bg-muted rounded" />
                  <div className="ml-auto flex items-center gap-4">
                    <div className="h-5 w-16 bg-muted rounded-md" />
                    <div className="h-5 w-8 bg-muted rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function DesktopHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 hidden border-b border-border bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 animate-pulse">
        <div className="flex items-center gap-4">
          {/* Logo e Nome do Grupo */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
            <div className="h-7 w-36 rounded-md bg-muted" />
          </div>

          {/* Botões de Navegação */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-40 rounded-md border border-border/50 bg-muted/60" />
            <div className="h-10 w-32 rounded-md border border-border/50 bg-muted/60" />
          </div>
        </div>

        {/* Card de Perfil e Logout */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card py-1.5 pl-2 pr-2.5">
          <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted/70" />
          </div>
          <div className="ml-1 h-8 w-8 rounded-md bg-muted/50" />
        </div>
      </div>
    </header>
  );
}

export { Skeleton, HomeSkeleton, FinanceSkeleton, DrawTeamsSkeleton, AdminSkeleton, DesktopHeaderSkeleton };