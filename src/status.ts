import { useSyncExternalStore } from 'react';

// A single app-wide status line ("Uploading 3 of 12…", "Exported").
let status: string | null = null;
let timer: number | undefined;
const subs = new Set<() => void>();

export function setStatus(s: string | null, clearAfterMs?: number) {
  status = s;
  window.clearTimeout(timer);
  if (clearAfterMs) timer = window.setTimeout(() => setStatus(null), clearAfterMs);
  subs.forEach((f) => f());
}

export function useStatus() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => status
  );
}
