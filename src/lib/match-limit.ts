import { useEffect, useState } from "react";

const KEY = "bpb-match-limit";
const EVT = "bpb-match-limit-change";
export const DEFAULT_LIMIT = 24;
export const MIN_LIMIT = 4;
export const MAX_LIMIT = 40;

export function clampLimit(n: number) {
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.round(n)));
}

function read() {
  if (typeof window === "undefined") return DEFAULT_LIMIT;
  const v = Number(window.localStorage.getItem(KEY));
  return Number.isFinite(v) && v > 0 ? clampLimit(v) : DEFAULT_LIMIT;
}

export function setMatchLimit(n: number) {
  window.localStorage.setItem(KEY, String(clampLimit(n)));
  window.dispatchEvent(new Event(EVT));
}

export function useMatchLimit() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  useEffect(() => {
    const sync = () => setLimit(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return limit;
}
