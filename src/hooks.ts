import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getBlob, getProject, listItems, listProjects, subscribe } from './db';
import type { Item, Project } from './types';

function useDbQuery<T>(query: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let live = true;
    const run = () => query().then((v) => live && setValue(v));
    run();
    const off = subscribe(run);
    return () => {
      live = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export interface ProjectSummary extends Project {
  items: Item[];
}

export function useProjects(): ProjectSummary[] | undefined {
  return useDbQuery(async () => {
    const ps = await listProjects();
    return Promise.all(ps.map(async (p) => ({ ...p, items: ordered(p, await listItems(p.id)) })));
  }, []);
}

export function useProject(id: string) {
  return useDbQuery(async () => {
    const p = await getProject(id);
    if (!p) return null;
    return { project: p, items: ordered(p, await listItems(id)) };
  }, [id]);
}

function ordered(p: Project, items: Item[]): Item[] {
  const pos = new Map(p.order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9) || a.createdAt - b.createdAt);
}

const urlCache = new Map<string, Promise<string | null>>();

export function blobUrl(store: 'files' | 'thumbs', id: string): Promise<string | null> {
  const key = `${store}:${id}`;
  let p = urlCache.get(key);
  if (!p) {
    p = getBlob(store, id).then((b) => (b ? URL.createObjectURL(b) : null));
    urlCache.set(key, p);
  }
  return p;
}

export function useBlobUrl(store: 'files' | 'thumbs', id: string | null | undefined, enabled = true): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!id || !enabled) return;
    let live = true;
    blobUrl(store, id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [store, id, enabled]);
  return url;
}

function hashSnapshot() {
  return location.hash.replace(/^#/, '') || '/';
}
export function useRoute(): string[] {
  const hash = useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    hashSnapshot
  );
  return useMemo(() => hash.split('/').filter(Boolean), [hash]);
}

export const go = (path: string) => {
  location.hash = path;
};

export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}
