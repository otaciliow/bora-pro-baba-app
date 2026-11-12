import { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Copy,
  FileText,
  Hourglass,
  ImageIcon,
  Info,
  Paperclip,
  QrCode,
  ShieldCheck,
  Trophy,
  UploadCloud,
  Wallet,
  Send,
  X,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Status = "aprovado" | "analise" | "pendente";

type Payment = {
  month: string;
  sentAt: string;
  status: Status;
};

const CURRENT_MONTH = (() => {
  const now = new Date();
  const monthName = now.toLocaleString("pt-BR", { month: "long" });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = now.getFullYear();
  return `${capitalized} ${year}`;
})();

const STATUS_META: Record<
  Status,
  { label: string; chip: string; icon: typeof CheckCircle2 }
> = {
  aprovado: {
    label: "Aprovado",
    chip: "border-transparent bg-primary/15 text-primary",
    icon: CheckCircle2,
  },
  analise: {
    label: "Em Análise",
    chip: "border-transparent bg-secondary/15 text-secondary",
    icon: Hourglass,
  },
  pendente: {
    label: "Pendente",
    chip: "border-transparent bg-destructive/15 text-destructive",
    icon: AlertCircle,
  },
};

// ============= Utilidades =============

function formatBRL(value: number): string {
  const [int, dec] = value.toFixed(2).split(".");
  const grouped = (int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped},${dec ?? "00"}`;
}

function formatDateToMonthLabel(dateString: string): string {
  if (!dateString) return CURRENT_MONTH;
  if (!dateString.includes("-")) return dateString;

  const [year, monthNum] = dateString.split("-");
  const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
  const monthName = dateObj.toLocaleString("pt-BR", { month: "long" });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

// function parseMonthLabelToDate(monthLabel: string): string {
//   const [monthName, yearStr] = monthLabel.split(" ");
//   const monthsMap: Record<string, string> = {
//     janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05", junho: "06",
//     julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
//   };
//   const monthNum = monthsMap[monthName?.toLowerCase()] || "01";
//   return `${yearStr}-${monthNum}-01`;
// }

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

// ============= Tela =============

export default function Finance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_MONTH);
  const [copied, setCopied] = useState(false);

  const { data: group } = useQuery({
    queryKey: ["user-group-finance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.rpc as any)("get_user_group");
      if (error) throw error;
      return data || null;
    },
    enabled: !!user?.id,
  });

  const fee = group?.monthly_fee ?? 0;
  const pixKey = group?.pix_key || "Chave Pix não cadastrada";

  const { data: paymentsData = [] } = useQuery({
    queryKey: ["user-payments", group?.id, user?.id],
    queryFn: async () => {
      if (!group?.id || !user?.id) return [];
      const { data, error } = await supabase
        .from("monthly_payments")
        .select("*")
        .eq("group_id", group.id)
        .eq("user_id", user.id)

      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.id && !!user?.id,
  })

  const history = useMemo(() => {
    const monthsMap = new Map<string, any>();
    monthsMap.set(CURRENT_MONTH, {
      month: CURRENT_MONTH,
      sentAt: "Aguardando pagamento",
      status: "pendente" as Status,
    });

    paymentsData.forEach((p: any) => {
      const monthLabel = formatDateToMonthLabel(p.reference_month);

      let sentAtText = "Aguardando pagamento";
      if (p.reference_month) {
        const [year, month, day] = p.reference_month.split("-");
        if (year && month && day) {
          sentAtText = `Informado em ${day}/${month}/${year}`;
        }
      }

      let mappedStatus: Status = "pendente";
      if (p.status === "pending") mappedStatus = "analise";
      if (p.status === "approved") mappedStatus = "aprovado";

      monthsMap.set(monthLabel, {
        month: monthLabel,
        sentAt: sentAtText,
        status: mappedStatus,
      });
    });

    return Array.from(monthsMap.values());
  }, [paymentsData]);

  const informPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!group?.id || !user?.id) throw new Error("Grupo ou usuário não identificados");

      const exactDate = new Date().toISOString();

      const { error } = await supabase.from("monthly_payments").insert({
        group_id: group.id,
        user_id: user.id,
        reference_month: exactDate,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-payments"] });
      toast.success("Pagamento informado!", {
        description: `A diretoria foi avisada sobre o Pix referente a ${selectedMonth}.`,
      });
    },
    onError: (err: any) => {
      toast.error(`Erro ao informar pagamento: ${err.message}`);
    },
  });

  const paidTotal = useMemo(
    () => history.filter((h) => h.status === "aprovado").length * fee,
    [history],
  );
  const approvedCount = useMemo(
    () => history.filter((h) => h.status === "aprovado").length,
    [history],
  );
  const currentEntry = history.find((h) => h.month === CURRENT_MONTH);
  const currentStatus: Status = currentEntry?.status ?? "pendente";
  const isButtonDisabled = currentStatus === "analise" || currentStatus === "aprovado" || informPaymentMutation.isPending;

  const handleCopyPix = async () => {
    const ok = await copyToClipboard(pixKey);
    if (ok) {
      setCopied(true);
      toast.success("Chave PIX copiada!", {
        description: "Basta colar no app do banco e pagar os " + formatBRL(fee) + " do mês.",
      });
    } else {
      toast.error("Não deu pra copiar sozinho", {
        description: "Seu navegador bloqueou a cópia — seleciona a chave e copie manual.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-12">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Banknote}
            label="Mensalidade"
            value={formatBRL(fee)}
            hint="por atleta, todo mês"
          />
          <StatCard
            icon={currentStatus === "aprovado" ? CheckCircle2 : Hourglass}
            label={`Mês atual · ${CURRENT_MONTH.split(" ")[0]}`}
            value={STATUS_META[currentStatus].label}
            hint={
              currentStatus === "pendente"
                ? "ainda não deu tempo, cola aqui embaixo"
                : "já está com a diretoria"
            }
            tone={currentStatus}
          />
          <StatCard
            icon={ShieldCheck}
            label="Pago em 2026"
            value={formatBRL(paidTotal)}
            hint={`${approvedCount} mensalidades aprovadas`}
          />
        </div>

        <PixCard
          copied={copied}
          isPending={informPaymentMutation.isPending}
          onCopy={handleCopyPix}
          onInformPayment={() => informPaymentMutation.mutate()}
          pixKey={pixKey}
          selectedMonth={selectedMonth}
          isDisabled={isButtonDisabled}
          currentStatus={currentStatus}
        />

        <HistoryCard history={history} fee={fee} />
      </main>
    </div>
  );
}

// ============= Peças =============

function StatusChip({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status] || STATUS_META.pendente;
  const Icon = meta.icon;
  return (
    <Badge className={cn("gap-1.5", meta.chip, className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutro",
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  hint: string;
  tone?: Status | "neutro";
}) {
  const toneClass =
    tone === "aprovado"
      ? "text-primary"
      : tone === "analise"
        ? "text-secondary"
        : tone === "pendente"
          ? "text-destructive"
          : "text-foreground";

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("truncate font-display text-2xl tracking-wide", toneClass)}>{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PixCard({
  pixKey,
  onCopy,
  copied,
  selectedMonth,
  onInformPayment,
  isPending,
  isDisabled,
  currentStatus,
}: {
  pixKey: string;
  onCopy: () => void;
  copied: boolean;
  selectedMonth: string;
  onInformPayment: () => void;
  isPending: boolean;
  isDisabled: boolean;
  currentStatus: Status;
}) {
  return (
    <Card className="border-primary/25 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-2xl tracking-wide">
          <QrCode className="h-5 w-5 text-primary" />
          Chave PIX do Baba
        </CardTitle>
        <CardDescription>
          Faça o Pix para a chave abaixo e informe o pagamento para a diretoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Chave cadastrada
              </p>
              <p className="mt-1 break-all font-mono text-lg font-semibold text-primary">
                {pixKey}
              </p>
              <Button className="mt-3 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onCopy}>
                {copied ? <CheckCircle2 className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}
                {copied ? "Chave copiada!" : "Copiar Chave"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-4">
            <h3 className="font-semibold text-sm">Já realizou o PIX?</h3>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mês de referência · {selectedMonth}
              </label>
            </div>

            <Button className="w-full gap-2 bg-linear-to-r from-primary to-secondary text-primary-foreground hover:opacity-95" disabled={isDisabled} onClick={onInformPayment}>
              {!isDisabled && (
                <Send className="h-4 w-4"/>
              )}
              {isPending ? "Registrando..." : isDisabled ? "Mensalidade Regularizada" : "Informar Pagamento via PIX"}
            </Button>
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-xs text-secondary">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
          Após informar o pagamento, a diretoria poderá conferir e aprovar o status na aba financeira.
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate text-right",
          strong ? "font-display text-lg tracking-wide text-secondary" : "text-sm",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function HistoryCard({ history, fee }: { history: Payment[], fee: number }) {
  const approved = history.filter((h) => h.status === "aprovado").length;
  const pct = Math.round((approved / Math.max(history.length, 1)) * 100);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 font-display text-2xl tracking-wide">
              <Wallet className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>Acompanhe o status das suas mensalidades</CardDescription>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{approved} de {history.length} meses aprovados</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Tabela em telas médias pra cima */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs uppercase tracking-wider">Mês</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Envio</TableHead>
                <TableHead className="pr-6 text-right text-xs uppercase tracking-wider">
                  Valor
                </TableHead>
                <TableHead className="pr-6 text-right text-xs uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((p) => (
                <TableRow key={p.month} className="border-border/60">
                  <TableCell className="pl-6 font-semibold">{p.month}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.sentAt}</TableCell>
                  <TableCell className="pr-6 text-right font-medium tabular-nums">
                    {formatBRL(fee)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <StatusChip status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Lista empilhada no celular */}
        <ul className="divide-y divide-border md:hidden">
          {history.map((p) => (
            <li key={p.month} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-semibold">{p.month}</p>
                <p className="truncate text-xs text-muted-foreground">{p.sentAt}</p>
              </div>
              <span className="shrink-0 text-right font-display text-lg tracking-wide tabular-nums">
                {formatBRL(fee)}
              </span>
              <StatusChip status={p.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
