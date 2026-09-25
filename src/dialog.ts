import { useSyncExternalStore } from 'react';

// In-app replacements for prompt() / confirm().
export type DialogState =
  | { kind: 'text'; title: string; value: string; confirm: string; resolve: (v: string | null) => void }
  | { kind: 'confirm'; title: string; body: string; confirm: string; danger?: boolean; resolve: (v: boolean) => void }
  | null;

let state: DialogState = null;
const subs = new Set<() => void>();
const set = (s: DialogState) => {
  state = s;
  subs.forEach((f) => f());
};

export const askText = (title: string, value = '', confirm = 'Save') =>
  new Promise<string | null>((resolve) =>
    set({ kind: 'text', title, value, confirm, resolve: (v) => (set(null), resolve(v)) })
  );

export const askConfirm = (title: string, body: string, confirm = 'Delete', danger = true) =>
  new Promise<boolean>((resolve) =>
    set({ kind: 'confirm', title, body, confirm, danger, resolve: (v) => (set(null), resolve(v)) })
  );

export function useDialog(): DialogState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state
  );
}
