import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Trophy, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addGuest, hostFromToken, GUEST_POSITIONS, type GuestPosition } from "@/lib/guests";

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
  const host = hostFromToken(token);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<GuestPosition | "">("");
  const [done, setDone] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!host || !position || name.trim().length < 2) return;
    addGuest(name, position, host);
    setDone((d) => [...d, name.trim()]);
    setName("");
    setPosition("");
  };

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
        {!host ? (
          <Card><CardHeader><CardTitle>Convite inválido</CardTitle><CardDescription>Peça um novo link a quem te convidou.</CardDescription></CardHeader></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-wide">Você foi convidado!</CardTitle>
              <CardDescription>
                <b className="text-foreground">{host}</b> te chamou para o próximo baba — sábado 03/10, 15:00, Arena Gol de Placa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name">Nome</Label>
                  <Input id="guest-name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Posição</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as GuestPosition)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Escolha a posição" /></SelectTrigger>
                    <SelectContent>
                      {GUEST_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={!position}>
                  <UserPlus className="mr-1 h-4 w-4" /> Entrar na lista
                </Button>
              </form>
              {done.length > 0 && (
                <div className="space-y-1 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
                  {done.map((n, i) => (
                    <p key={i} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{n} está na lista!</p>
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
