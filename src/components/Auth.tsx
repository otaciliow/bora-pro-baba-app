import { useState, type FormEvent } from "react";
import {
  Trophy,
  Users,
  CalendarCheck,
  Dices,
  Shield,
  KeyRound,
  Hourglass,
  Sparkles,
  Eye,
  EyeOff,
  LoaderCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const POSITIONS = [
  { value: "goalkeeper", label: "Goleiro" },
  { value: "defender", label: "Defensor" },
  { value: "midfielder", label: "Meia" },
  { value: "forward", label: "Atacante" },
];

export default function Auth() {
  const { user, status, ready, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user && status === "approved") navigate({ to: "/", replace: true });
  }, [ready, user, status, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(90deg,transparent_0_80px,oklch(0.7_0.17_162)_80px_82px)]" />
        <div className="absolute -top-24 left-1/2 h-72 w-2xl -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl p-6 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-3">
            <span className="flex h-12 md:h-14 w-12 md:w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Trophy className="h-6 md:h-7 w-6 md:w-7" />
            </span>
            <h1 className="font-display text-4xl leading-none tracking-wide md:text-8xl">
              Bora <span className="text-primary">pro</span> <span className="text-secondary">Baba</span>
            </h1>
          </div>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            A organização do seu futebol semanal sem dor de cabeça.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <Badge icon={<Users className="h-4 w-4" />} label="Times equilibrados" />
            <Badge icon={<CalendarCheck className="h-4 w-4" />} label="Confirmação de presença" />
            <Badge icon={<Dices className="h-4 w-4" />} label="Sorteio na hora" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        {status === "pending" ? <PendingCard onLogout={signOut} /> : <AuthForms />}
      </main>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

export function PendingCard({ onLogout }: { onLogout: () => void }) {
  return (
    <Card className="border-2 border-secondary/60 text-center">
      <CardHeader>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15">
          <Hourglass className="h-8 w-8 text-secondary" />
        </div>
        <CardTitle className="font-display text-3xl tracking-wide">Aguardando Aprovação</CardTitle>
        <CardDescription className="text-base">
          Sua solicitação está em análise pela diretoria do baba! Assim que um admin aprovar, você
          entra em campo. ⚽
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enquanto isso, já vai alongando… a estreia está próxima.
        </p>
        <Button variant="outline" onClick={onLogout}>Sair</Button>
      </CardContent>
    </Card>
  );
}

function AuthForms() {
  return (
    <Tabs defaultValue="login">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Entrar</TabsTrigger>
        <TabsTrigger value="signup">Criar Conta</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="signup">
        <SignupForm />
      </TabsContent>
    </Tabs>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success("Login efetuado com sucesso!")
      navigate({ to: "/", replace: true })
    } catch (err: any) {
      toast.error(`Erro ao entrar! Verifique seu e-mail ou senha.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl tracking-wide">Entrar</CardTitle>
        <CardDescription>Acesse sua conta com e-mail e senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail" type="email" value={email} onChange={setEmail} />
          <Field label="Senha" type="password" value={password} onChange={setPassword} isPassword={true} />
          <Button type="submit" className="w-full">
            {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span className="">Entrando...</span>
                </>
              ) : (
                "Entrar em campo"
              )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SignupForm() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    group_name: "",
    invite_code: "",
    name: "",
    email: "",
    password: "",
    position: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const { signInWithGroup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithGroup({
        email: f.email,
        pass: f.password,
        name: f.name,
        position: f.position,
        mode: mode,
        groupName: mode === "create" ? f.group_name : "",
        inviteCode: mode === "join" ? f.invite_code : "",
      })
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/", replace: true })
    } catch (err: any) {
      toast.error(`Erro ao cadastrar: ${err.message || "Tente novamente"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl tracking-wide">Criar Conta</CardTitle>
        <CardDescription>Escolha como você quer entrar nessa resenha.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Escolha visual do modo */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "create"}
            onClick={() => setMode("create")}
            icon={<Shield className="h-6 w-6" />}
            title="Criar um Novo Baba"
            desc="Você vira o admin e convida a galera"
          />
          <ModeCard
            active={mode === "join"}
            onClick={() => setMode("join")}
            icon={<KeyRound className="h-6 w-6" />}
            title="Entrar em um Baba Existente"
            desc="Use o código de convite do admin"
          />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "create" ? (
            <Field label="Nome do Baba" value={f.group_name} onChange={set("group_name")} placeholder="Ex: Baba de Quinta FC" />
          ) : (
            <Field
              label="Código de Convite do Baba"
              value={f.invite_code}
              onChange={(v) => set("invite_code")(v.toUpperCase())}
              placeholder="Ex: BABA-SEG-7K2Q"
            />
          )}
          <Field label="Nome do Atleta" value={f.name} onChange={set("name")} />
          <Field label="E-mail" type="email" value={f.email} onChange={set("email")} />
          <Field label="Senha" type="password" value={f.password} onChange={set("password")} isPassword={true} />

          <div className="space-y-1.5">
            <Label>Posição Principal</Label>
            <Select value={f.position} onValueChange={set("position")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha sua posição" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" className="w-full">
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {mode === "create" ? "Criar meu Baba" : loading ? "Entrando..." : "Pedir para entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </span>
      <p className="font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  isPassword
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  isPassword?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword && showPassword ? "text" : type;

  const id = label.toLowerCase().replace(/\W+/g, "-");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={value}
          placeholder={placeholder}
          required
          onChange={(e) => onChange(e.target.value)}
          className={isPassword ? "pr-10" : ""}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
