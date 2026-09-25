import { useSyncExternalStore } from 'react';

// Only cool tones: blues, teals, greens, violets and slate — light and dark.
export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  bg: string; // app background (sidebar area)
  panel: string; // main content surface
  card: string; // tiles, inputs
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
}

export const THEMES: Theme[] = [
  { id: 'glacier', name: 'Glacier', dark: false, bg: '#e3ecf8', panel: '#f3f7fd', card: '#ffffff', fg: '#0f1b2d', muted: '#5b6b80', line: '#d3deec', accent: '#2f6fed', accentFg: '#ffffff' },
  { id: 'lagoon', name: 'Lagoon', dark: false, bg: '#d9eeec', panel: '#f0f8f7', card: '#ffffff', fg: '#0d2624', muted: '#52706d', line: '#c7e1de', accent: '#0f8f84', accentFg: '#ffffff' },
  { id: 'mint', name: 'Mint', dark: false, bg: '#ddf0e5', panel: '#f2faf5', card: '#ffffff', fg: '#10261a', muted: '#56715f', line: '#cbe3d4', accent: '#15935f', accentFg: '#ffffff' },
  { id: 'lavender', name: 'Lavender', dark: false, bg: '#e6e3f8', panel: '#f5f4fd', card: '#ffffff', fg: '#1c1633', muted: '#6a6488', line: '#d8d3f0', accent: '#6c5ce7', accentFg: '#ffffff' },
  { id: 'mist', name: 'Mist', dark: false, bg: '#e1e6ec', panel: '#f4f6f9', card: '#ffffff', fg: '#161b22', muted: '#5e6875', line: '#d2d9e1', accent: '#3b5b82', accentFg: '#ffffff' },
  { id: 'midnight', name: 'Midnight', dark: true, bg: '#0a1120', panel: '#111a2d', card: '#17223a', fg: '#e6edf7', muted: '#8a98b0', line: '#223049', accent: '#5aa2ff', accentFg: '#06101f' },
  { id: 'deepsea', name: 'Deep Sea', dark: true, bg: '#06181a', panel: '#0c2427', card: '#113034', fg: '#dff3f1', muted: '#7fa3a0', line: '#1a3b3f', accent: '#2dd4bf', accentFg: '#04201d' },
  { id: 'aurora', name: 'Aurora', dark: true, bg: '#110e22', panel: '#1a1632', card: '#221d40', fg: '#ece9fb', muted: '#9690b8', line: '#2d2750', accent: '#a48bff', accentFg: '#140f2b' },
];

const KEY = 'gig-theme';
function load(): Theme {
  let id: string | null = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

let current = load();
const subs = new Set<() => void>();

export function applyTheme(t: Theme = current) {
  const s = document.documentElement.style;
  s.setProperty('--bg', t.bg);
  s.setProperty('--panel', t.panel);
  s.setProperty('--card', t.card);
  s.setProperty('--fg', t.fg);
  s.setProperty('--muted', t.muted);
  s.setProperty('--line', t.line);
  s.setProperty('--accent', t.accent);
  s.setProperty('--accent-fg', t.accentFg);
  s.colorScheme = t.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
}

export function setTheme(t: Theme) {
  current = t;
  try {
    localStorage.setItem(KEY, t.id);
  } catch {
    /* storage blocked */
  }
  applyTheme(t);
  subs.forEach((f) => f());
}

export const getTheme = () => current;

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current
  );
}
