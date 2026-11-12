import { useEffect, useState } from "react";
import MatchManagement from "@/components/MatchManagement";
import { useMatchLimit, setMatchLimit, clampLimit, MIN_LIMIT, MAX_LIMIT } from "@/lib/match-limit";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Check, X, UserPlus, Receipt, Settings, Copy, FileText, Eye, ShieldCheck, Minus, Plus, Save,
  AlignVerticalDistributeStart, Banknote,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

const positionLabels: Record<string, string> = {
  goalkeeper: "Goleiro",
  defender: "Defensor",
  midfielder: "Meia",
  forward: "Atacante",
};

function formatDateToMonthLabel(dateString: string): string {
  if (!dateString) return "Mês atual";
  if (!dateString.includes("-")) return dateString;

  const [year, monthNum] = dateString.split("-");
  const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
  const monthName = dateObj.toLocaleString("pt-BR", { month: "long" });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<any | null>(null);
  const [pixInput, setPixInput] = useState("");
  const [monthlyFeeInput, setMonthlyFeeInput] = useState("");
  
  const limit = useMatchLimit();
  const [limitDraft, setLimitDraft] = useState(limit);
  useEffect(() => setLimitDraft(limit), [limit]);

  const { data: group, isLoading } = useQuery({
    queryKey: ["admin-group", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.rpc as any)("get_user_group");

      if (error) throw error;
      return data || null;
    },
    enabled: !!user?.id,
  });

  const { data: membership, isLoading: isLoadingMembership } = useQuery({
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

  const isChecking = isLoading || isLoadingMembership;
  const isAdmin = membership?.role === "admin";

  useEffect(() => {
    if (!isChecking && !isAdmin) {
      navigate({ to: "/", replace: true });
    }
  }, [isChecking, isAdmin, navigate])

  useEffect(() => {
    if (group?.pix_key) {
      setPixInput(group.pix_key);
    }

    if (group?.monthly_fee) {
      setMonthlyFeeInput(group?.monthly_fee);
    }
  }, [group?.pix_key, group?.monthly_fee]);

  const { data: pendingMembers = [] } = useQuery({
    queryKey: ["pending-members", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("id, user_id, status, created_at, profiles(name, primary_position, phone)")
        .eq("group_id", group.id)
        .eq("status", "pending");

      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.id,
  });

  const { data: pendingGuests = [] } = useQuery({
    queryKey: ["pending-guests", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];

      const { data: matches } = await supabase.from("matches").select("id").eq("is_open", true);
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map(m => m.id);

      const { data, error } = await supabase
        .from("match_guests")
        .select("*, matches(match_date, location), profiles:invited_by(name)")
        .in("match_id", matchIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || []
    },
    enabled: !!group?.id,
  })

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["pending-payments", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const { data, error } = await supabase
        .from("monthly_payments")
        .select("*, profiles(name)")
        .eq("group_id", group.id)
        .eq("status", "pending");

      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.id,
  });

  const saveMonthlyFeeMutation = useMutation({
    mutationFn: async (fee: number) => {
      if (!group?.id) return;
      const { error } = await (supabase.rpc as any)("update_group_monthly_fee", {
        _group_id: group.id,
        _monthly_fee: fee,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-group"] });
      toast.success("Valor da mensalidade atualzado! 💸")
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar o valor da mensalidade: ${err.message}`);
    }
  })

  const [editedRatings, setEditedRatings] = useState<Record<string, number>>({});

  const { data: groupAthletes = [] } = useQuery({
    queryKey: ["group-athletes", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("id, user_id, status, profiles(id, name, primary_position, rating)")
        .eq("group_id", group.id)
        .eq("status", "approved");

      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.id,
  });

  const handleLocalRate = (profileId: string, currentRating: number, delta: number) => {
    const baseRating = editedRatings[profileId] !== undefined ? editedRatings[profileId] : (currentRating || 5);
    const newRating = Math.min(10, Math.max(0, Math.round((baseRating + delta) * 2) / 2));

    setEditedRatings((prev) => ({
      ...prev,
      [profileId]: newRating,
    }));
  };

  const saveAllRatingsMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(editedRatings);
      if (entries.length === 0) return;

      for (const [profileId, rating] of entries) {
        const { error } = await (supabase.rpc as any)("update_athlete_rating", {
          _target_user_id: profileId,
          _new_rating: rating,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-athletes"] });
      setEditedRatings({});
      toast.success(`Notas atualizadas! ✅`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar as notas: ${err.message}`);
    }
  })

  const decideMutation = useMutation({
    mutationFn: async ({ memberId, approve }: { memberId: string, approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from("group_members")
          .update({ status: "approved" })
          .eq("id", memberId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("id", memberId);

        if (error) throw error;
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-members"] });
      queryClient.invalidateQueries({ queryKey: ["group-athletes"] });
      toast.success(approve ? "Atleta aprovado! ⚽" : "Solicitação recusada! ❌")
    },
    onError: (err: any) => {
      toast.error(`Erro ao processar sua solicitação: ${err.message}`);
    },
  });

  const reviewGuestMutation = useMutation({
    mutationFn: async ({ guestId, approve }: { guestId: string, approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from("match_guests")
          .update({ status: "approved" })
          .eq("id", guestId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("match_guests")
          .delete()
          .eq("id", guestId);

        if (error) throw error;
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-guests"] });
      queryClient.invalidateQueries({ queryKey: ["match-participants"] });
      toast.success(approve ? "Visitante aprovado para o baba! ⚽" : "Visitante recusado no baba ❌");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar status do visitante: ${err.message}`);
    }
  })

  const reviewPayments = async (paymentId: string, approve: boolean, athleteName: string) => {
    const { error } = await supabase
      .from("monthly_payments")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", paymentId);

    if (error) {
      toast.error(`Erro ao atualizar pagamento...`)
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    setPreview(null);
    toast.success(approve ? `Pagamento de ${athleteName} aprovado! 💸` : `Comprovante de ${athleteName} recusado! ❌`);
  };

  const savePixMutation = useMutation({
    mutationFn: async (newPix: string) => {
      if (!group?.id) return;
      const { error } = await (supabase.rpc as any)("update_group_pix", {
        _group_id: group.id,
        _pix_key: newPix,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-group"] });
      toast.success("Chave PIX atualizada! ✅");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar a chave pix: ${err.message}`);
    },
  });

  const updateRatingMutation = async (profileId: string, newRating: number) => {
    const clamped = Math.min(10, Math.max(0, Math.round(newRating * 2) / 2));
    const { error } = await supabase
      .from("profiles")
      .update({ rating: clamped })
      .eq("id", profileId);

    if (error) {
      toast.error("Erro ao atualizar nota");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["group-athletes"] });
  };

  return (
    <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-3xl leading-none tracking-wide" style={{ fontFamily: "Bebas Neue" }}>Painel da Diretoria</h1>
            <p className="truncate text-xs text-muted-foreground">{group?.name ??  "Carregando..."} · {"você é admin"}</p>
          </div>
        </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="entrada">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="entrada" className="gap-1.5 py-2 text-xs sm:text-sm">
              <UserPlus className="hidden h-4 w-4 sm:block" /> Solicitações
              {pendingMembers.length > 0 && <Badge className="ml-1 h-5 px-1.5">{pendingMembers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-1.5 py-2 text-xs sm:text-sm">
              <Receipt className="hidden h-4 w-4 sm:block" /> PIX
              {pendingPayments.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingPayments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="gestao" className="gap-1.5 py-2 text-xs sm:text-sm">
              <Settings className="hidden h-4 w-4 sm:block" /> Gestão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entrada" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações de Entrada (Mensalista)</CardTitle>
                <CardDescription>Atletas que pediram pra entrar como mensalista pelo código de convite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMembers.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente. 🎉</p>}
                {pendingMembers.map((m: any) => {
                  const athleteName = m.profiles?.name || "Atleta";
                  const rawPos = m.profiles?.primary_position;
                  const posName = rawPos ? (positionLabels[rawPos.toLowerCase()] || rawPos) : "Indefinida";
                  const dateFormatted = new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

                  return (
                    <div key={athleteName} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="shrink-0"><AvatarFallback>{initials(athleteName)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{athleteName}</p>
                          <p className="truncate text-xs text-muted-foreground">{posName} · pediu em {dateFormatted}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decideMutation.mutate({ memberId: m.id, approve: true })}><Check className="h-4 w-4" /><span className="hidden sm:inline">Aprovar</span></Button>
                        <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ memberId: m.id, approve: false })}><X className="h-4 w-4" /><span className="hidden sm:inline">Recusar</span></Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Visitantes Pendentes</CardTitle>
                <CardDescription>Convidados via link que aguardam a confirmação do pagamento para entrar no sorteio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingGuests.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum visitante aguardando aprovação. 🎉</p>}
                {pendingGuests.map((g: any) => {
                  const matchDateFormatted = g.matches?.match_date
                    ? new Date(g.matches.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
                    : "Próxima partida";
                  
                  const positionLabel = positionLabels[g.position?.toLowerCase()] || g.position || "Linha";
                  const isApproved = g.status === "approved";

                  return (
                    <div key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <span className="truncate font-semibold">
                          {g.name} <span className="text-xs font-normal text-muted-foreground">({positionLabel})</span>
                          {/* {isApproved && <Badge variant="default" className="ml-4 text-[10px] h-5 bg-emerald-600 text-white">Aprovado</Badge>} */}
                        </span>
                        <p className="truncate text-xs text-muted-foreground mt-2">
                          Baba em <span className="text-foreground font-medium">{matchDateFormatted}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground mt-2">
                          Convidado por <span className="text-foreground font-medium">{g.profiles?.name || "Mensalista"}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewGuestMutation.mutate({ guestId: g.id, approve: true })} disabled={isApproved}>
                          <Check className="h-4 w-4" />
                          <span className="hidden sm:inline">Aprovar</span>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => reviewGuestMutation.mutate({ guestId: g.id, approve: false })}>
                          <X className="h-4 w-4" />
                          <span className="hidden sm:inline">Recusar</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pix" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Conferência de PIX</CardTitle>
                <CardDescription>Confira os pagamentos informados pelos atletas e aprove ou recuse.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPayments.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Todos os comprovantes conferidos. 🎉</p>}
                {pendingPayments.map((p: any) => {
                  const athleteName = p.profiles?.name || "Atleta";
                  const monthLabel = formatDateToMonthLabel(p.reference_month);

                  return (
                    <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{athleteName}</p>
                        <p className="truncate text-xs text-muted-foreground">{monthLabel}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setPreview(p)}><Eye className="h-4 w-4" /> Detalhes</Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gestao" className="mt-4 space-y-4">
            <MatchManagement group={group} />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Chave PIX</CardTitle><CardDescription>Aparece na tela Financeiro dos atletas.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Label htmlFor="pix">Chave cadastrada</Label>
                  <Input id="pix" value={pixInput} onChange={(e) => setPixInput(e.target.value)} />
                  <Button className="w-full" onClick={() => savePixMutation.mutate(pixInput)} disabled={!pixInput.trim()}>
                    <Save className="h-4 w-4" /> Salvar Chave
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Código de Convite</CardTitle><CardDescription>Mande pra galera entrar no baba.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-dashed border-secondary bg-secondary/10 py-4 text-center text-3xl tracking-[0.2em] text-secondary" style={{ fontFamily: "Bebas Neue" }}>
                    {group?.invite_code ?? "---------"}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { copy(group?.invite_code || ""); toast.success("Código copiado!"); }}>
                    <Copy className="h-4 w-4" /> Copiar Código
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Limite de Confirmados</CardTitle><CardDescription>Quantos atletas podem confirmar presença em cada baba (entre {MIN_LIMIT} e {MAX_LIMIT}).</CardDescription></CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Button size="icon" variant="outline" onClick={() => setLimitDraft((v) => clampLimit(v - 1))} aria-label="Diminuir limite"><Minus className="h-4 w-4" /></Button>
                  <Input type="number" min={MIN_LIMIT} max={MAX_LIMIT} value={limitDraft} onChange={(e) => setLimitDraft(Number(e.target.value))} className="w-20 text-center text-lg font-bold" aria-label="Limite de confirmados" />
                  <Button size="icon" variant="outline" onClick={() => setLimitDraft((v) => clampLimit(v + 1))} aria-label="Aumentar limite"><Plus className="h-4 w-4" /></Button>
                  <Button onClick={() => { const v = clampLimit(limitDraft); setLimitDraft(v); setMatchLimit(v); toast.success(`Limite atualizado para ${v} confirmados.`); }} disabled={clampLimit(limitDraft) === limit && limitDraft === limit}>
                    <Save className="h-4 w-4" /> Salvar Limite
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Valor da Mensalidade</CardTitle><CardDescription>Reflete diretamente na página financeira dos atletas.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Label htmlFor="monthly-fee">Valor (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="monthly-fee" 
                      type="number" 
                      className="pl-9" 
                      value={monthlyFeeInput} 
                      onChange={(e) => setMonthlyFeeInput(e.target.value)} 
                      placeholder="0.00" 
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => saveMonthlyFeeMutation.mutate(parseFloat(monthlyFeeInput) || 0)} 
                    disabled={saveMonthlyFeeMutation.isPending}
                  >
                    <Save className="h-4 w-4" /> {saveMonthlyFeeMutation.isPending ? "Salvando..." : "Salvar Mensalidade"}
                  </Button>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Notas dos Atletas</CardTitle>
                  <CardDescription>Usadas para equilibrar o sorteio dos times.</CardDescription>
                </div>
                {Object.keys(editedRatings).length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => saveAllRatingsMutation.mutate()}
                    disabled={saveAllRatingsMutation.isPending}
                  >
                    Salvar Alterações ({Object.keys(editedRatings).length})
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {groupAthletes.map((a: any) => {
                  const profile = a.profiles;

                  const rawPos = profile.primary_position;
                  const posName = rawPos ? (positionLabels[rawPos.toLowerCase()] || rawPos) : "Posição";

                  const currentRating = editedRatings[profile.id] !== undefined ? editedRatings[profile.id] : (profile.rating || 5);
                  const isModified = editedRatings[profile.id] !== undefined;

                  return (
                    <div key={profile.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{profile.name}{isModified && (<span> · 🚨</span>)}</p>
                        <p className="text-xs text-muted-foreground">{posName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleLocalRate(profile.id, profile.rating || 5, -0.5)} aria-label="Diminuir nota"><Minus className="h-4 w-4" /></Button>
                        <span className="w-10 text-center text-lg font-bold text-primary">{Number(currentRating).toFixed(1)}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleLocalRate(profile.id, profile.rating || 5, 0.5)} aria-label="Aumentar nota"><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )
                }
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.profiles?.name || "Atleta"}</DialogTitle>
                <DialogDescription>Referência: {formatDateToMonthLabel(preview.reference_month)}</DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[50vh] w-full place-items-center rounded-lg border border-border bg-muted p-4">
                <div className="w-full space-y-3 rounded-xl bg-card p-6 text-center shadow">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Banknote className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-primary">PIX Informado pelo Atleta ✓</p>
                  <p className="text-xs text-muted-foreground">Chave PIX do grupo: {group?.pix_key || "Não cadastrada"}</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => reviewPayments(preview.id, false, preview.profiles?.name || "Atleta")}><X className="h-4 w-4" /> Recusar</Button>
                <Button onClick={() => reviewPayments(preview.id, true, preview.profiles?.name || "Atleta")}><Check className="h-4 w-4" /> Aprovar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
