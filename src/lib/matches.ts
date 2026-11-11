// MOCK: partidas salvas apenas neste navegador; veja PRODUCTION_STRUCTURE.ts.
import { useEffect, useState } from "react";
import { z } from "zod";

export const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data da partida."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  location: z.string().trim().min(1, "Informe o local da partida.").max(160),
});
export type MatchDraft = z.infer<typeof matchSchema>;
export type OpenMatch = MatchDraft & { id: string; isOpen: true };
const KEY = "bpb-open-match";
const EVENT = "bpb-match-change";

export function matchDate(match: MatchDraft) {
  return new Date(`${match.date}T${match.time}:00`);
}

export function validateMatch(input: MatchDraft, now = new Date()) {
  const parsed = matchSchema.parse(input);
  const date = matchDate(parsed);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) {
    throw new Error("Escolha uma data e um horário futuros.");
  }
  return parsed;
}

export function openMatch(input: MatchDraft) {
  const values = validateMatch(input);
  const match: OpenMatch = { ...values, id: crypto.randomUUID(), isOpen: true };
  window.localStorage.setItem(KEY, JSON.stringify(match));
  window.dispatchEvent(new Event(EVENT));
  return match;
}

export function useOpenMatch() {
  const [match, setMatch] = useState<OpenMatch | null>(null);
  useEffect(() => {
    const sync = () => {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
        if (!stored || typeof stored !== "object" || !("id" in stored) || typeof stored.id !== "string") {
          setMatch(null);
          return;
        }
        const result = matchSchema.safeParse(stored);
        setMatch(result.success ? { ...result.data, id: stored.id, isOpen: true } : null);
      } catch { setMatch(null); }
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return match;
}