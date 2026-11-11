import { useEffect, useState } from "react";

/** Nota fixa de todo visitante. */
export const GUEST_RATING = 5.0;

export type GuestPosition = "Goleiro" | "Defensor" | "Meia" | "Atacante";
export const GUEST_POSITIONS: GuestPosition[] = ["Goleiro", "Defensor", "Meia", "Atacante"];

export interface Guest {
  id: string;
  name: string;
  position: GuestPosition;
  rating: number;
  invitedBy: string;
}

const KEY = "bpb-mock-guests";
const EVT = "bpb-guests-change";

function read(): Guest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Guest[];
  } catch {
    return [];
  }
}

function write(list: Guest[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function makeGuest(name: string, position: GuestPosition, invitedBy: string): Guest {
  return { id: Math.random().toString(36).slice(2, 10), name: name.trim(), position, rating: GUEST_RATING, invitedBy };
}

export function addGuest(name: string, position: GuestPosition, invitedBy: string) {
  const g = makeGuest(name, position, invitedBy);
  write([...read(), g]);
  return g;
}

export function removeGuest(id: string) {
  write(read().filter((g) => g.id !== id));
}

/** Link mockado: o token carrega quem convidou. */
export function inviteLink(origin: string, hostName: string) {
  return `${origin}/convite/${encodeURIComponent(btoa(unescape(encodeURIComponent(hostName))))}`;
}
export function hostFromToken(token: string) {
  try {
    return decodeURIComponent(escape(atob(decodeURIComponent(token))));
  } catch {
    return null;
  }
}

export function useGuests() {
  const [list, setList] = useState<Guest[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}
