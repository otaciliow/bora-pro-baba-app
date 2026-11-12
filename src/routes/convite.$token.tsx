import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Trophy, UserPlus, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GUEST_POSITIONS = ["Goleiro", "Defensor", "Meia", "Atacante"] as const;
type GuestPosition = (typeof GUEST_POSITIONS)[number];

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Bora pro Baba — Convite de Visitante" },
      { name: "description", content: "Você foi convidado para o próximo baba. Coloque seu nome e posição." },
      { property: "og:title", content: "Bora pro Baba — Você foi convidado!" },
      { property: "og:description", content: "Coloque seu nome e posição e entre na lista do próximo baba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestInvite,
});

function GuestInvite() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [position, setPosition] = useState<GuestPosition | "">("");
  const [done, setDone] = useState<string[]>([]);

  const { data: inviteData, isLoading } = useQuery({
    queryKey: ["guest-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_invites")
        .select(`*, matches(*), profiles:created_by(name)`)
        .eq("token", token)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const match = inviteData?.matches;
  const hostName = inviteData?.profiles?.name || "Um mensalista";

  const addGuestMutation = useMutation({
    mutationFn: async ({ guestName, guestPos }: { guestName: string; guestPos: string }) => {
      if (!inviteData) throw new Error("Convite inválido");

      const dbPositionMap: Record<string, "goalkeeper" | "defender" | "midfielder" | "forward"> = {
        Goleiro: "goalkeeper",
        Defensor: "defender",
        Meia: "midfielder",
        Atacante: "forward",
      };

      const selectedPosition = dbPositionMap[guestPos] || "midfielder"

      const { error } = await supabase
        .from("match_guests")
        .insert({
          match_id: inviteData.match_id,
          invited_by: inviteData.created_by,
          name: guestName.trim(),
          position: selectedPosition,
          rating: 5.0,
        });

        if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["match-participants"] });
      setDone((d) => [...d, variables.guestName]);
      setName("");
      setPosition("");
      toast.success("Presença confirmada!", {
        description: `${variables.guestName} entrou na lista do baba.`
      });
    },
    onError: (err: any) => {
      toast.error(`Erro ao entrar na lista: ${err.message}.`, {
        description: "Entre em contato com o mensalista para mais informações."
      })
    }
  })

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!inviteData || !position || name.trim().length < 2) return;
    addGuestMutation.mutate({ guestName: name, guestPos: position });
  };

  const matchDateFormatted = match?.match_date ? new Date(match.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : "";

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando convite...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </span>
          <span className="font-display text-4xl tracking-wide">
            Bora <span className="text-primary">pro</span> <span className="text-secondary">Baba</span>
          </span>
        </div>
        {!inviteData || (match && !match.is_open) ? (
          <Card>
            <CardHeader>
              <CardTitle>Convite inválido ou expirado</CardTitle>
              <CardDescription>Peça um novo link a quem te convidou ou a partida já foi encerrada.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-wide">Você foi convidado!</CardTitle>
              <CardDescription>
                <b className="text-foreground">{hostName}</b> te chamou para o próximo baba
                {matchDateFormatted ? ` — ${matchDateFormatted}` : ""}
                {match?.location ? `, ${match.location}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name">Seu Nome</Label>
                  <Input
                    id="guest-name"
                    required
                    minLength={2}
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sua Posição</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as GuestPosition)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha a posição" />
                    </SelectTrigger>
                    <SelectContent>
                      {GUEST_POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={!position || addGuestMutation.isPending}>
                  <UserPlus className="mr-1 h-4 w-4" />
                  {addGuestMutation.isPending ? "Entrando..." : "Entrar na lista"}
                </Button>
              </form>
              {done.length > 0 && (
                <div className="space-y-1 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
                  {done.map((n, i) => (
                    <p key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {n} está na lista do baba!
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">Quer incluir mais alguém? É só preencher de novo.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}