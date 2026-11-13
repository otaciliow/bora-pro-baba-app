import { useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, Plus, Ban, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { matchDate, openMatch, useOpenMatch } from "@/lib/matches";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MatchManagementProps {
  group: any;
}

export default function MatchManagement({ group }: MatchManagementProps) {
  const queryClient = useQueryClient();
  // const match = useOpenMatch();
  const [showForm, setShowForm] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["group-next-match", group?.id],
    queryFn: async () => {
      if (!group?.id) return null;
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("group_id", group.id)
        .eq("is_open", true)
        .order("match_date", { ascending: true })
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
    enabled: !!group?.id,
  });

  const createMatchMutation = useMutation({
    mutationFn: async ({ matchDateIso, matchLocation }: { matchDateIso: string; matchLocation: string }) => {
      if (!group?.id) throw new Error("Grupo não identificado.");

      const { error } = await supabase.from("matches").insert({
        group_id: group.id,
        match_date: matchDateIso,
        location: matchLocation,
        is_open: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-next-match"] });
      setShowForm(false);
      toast.success("Nova partida aberta com sucesso! ⚽");
    },
    onError: (err: any) => {
      setError(err.message || "Não foi possível abrir a partida.");
    },
  });

  const cancelMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ is_open: false })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-next-match"] });
      toast.success("Partida cancelada!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao cancelar partida: ${err.message}`);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!date) { setError("Escolha a data da partida."); return; }
    
    const dateFormatted = format(date, "yyyy-MM-dd");
    const matchDateIso = `${dateFormatted}T${time}:00`;

    createMatchMutation.mutate({
      matchDateIso,
      matchLocation: location,
    });
  };

  const getMatchDateObj = (isoStr: string) => {
    try {
      return new Date(isoStr.replace("+00:00", ""));;
    } catch {
      return new Date();
    }
  }

  return (
    <section className="border-b border-border pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-primary" /> Partidas</h2>
        <Button onClick={() => { setDate(undefined); setTime(""); setLocation(""); setError(""); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nova partida
        </Button>
      </div>
      
      {matchLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          Buscando dados da partida...
        </div>
      ) : match ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="font-semibold">{format(getMatchDateObj(match.match_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <Badge>Aberta</Badge>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelMatchMutation.mutate(match.id)}
              disabled={cancelMatchMutation.isPending}
            >
              <Ban className="h-4 w-4 mr-1.5" /> {cancelMatchMutation.isPending ? "Cancelando..." : "Cancelar Partida"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{format(getMatchDateObj(match.match_date), "HH:mm")}</span>
            <span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="wrap-break-word">{match.location || "Sem local cadastrado"}</span></span>
          </div>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">Nenhuma nova partida cadastrada.</p>}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova partida</DialogTitle>
            <DialogDescription>{match ? "A nova partida passa a ser a próxima partida do baba." : "Defina a data, o horário e o local do próximo baba."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="match-date">Data</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button id="match-date" type="button" variant="outline" className="w-full justify-start font-normal">
                      <CalendarDays className="h-4 w-4" />{date ? format(date, "dd/MM/yyyy") : "Escolher data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0 pointer-events-auto">
                    <Calendar mode="single" locale={ptBR} selected={date} onSelect={(value) => { setDate(value); if (value) setCalendarOpen(false); }} disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-time">Horário</Label>
                <Input id="match-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-location">Local / Campo</Label>
              <Input id="match-location" required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Nome do campo ou endereço" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit"><Plus className="h-4 w-4" /> Criar e abrir partida</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}