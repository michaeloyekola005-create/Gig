import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { allFolders, allItems, getBlob, getFolder, listFolders, listItems, subscribe } from './db';
import type { Folder, Item } from './types';

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

function ordered<T extends { id: string; createdAt: number }>(order: string[], list: T[]): T[] {
  const pos = new Map(order.map((id, i) => [id, i]));
  return [...list].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9) || a.createdAt - b.createdAt);
}

export interface FolderCardData extends Folder {
  count: number;
  previews: Item[]; // up to 3 images for the card, cover first
}

async function cardData(f: Folder): Promise<FolderCardData> {
  const [items, subs] = await Promise.all([listItems(f.id), listFolders(f.id)]);
  const visual = ordered(f.order, items).filter((i) => i.hasThumb);
  const cover = visual.find((i) => i.id === f.coverId);
  const previews = (cover ? [cover, ...visual.filter((i) => i !== cover)] : visual).slice(0, 3);
  return { ...f, count: items.length + subs.length, previews };
}

export function useFolder(id: string) {
  return useDbQuery(async () => {
    const folder = await getFolder(id);
    if (!folder) return null;
    const [subs, items] = await Promise.all([listFolders(id), listItems(id)]);
    const path: Folder[] = [];
    for (let f: Folder | undefined = folder; f; f = f.parentId ? await getFolder(f.parentId) : undefined) path.unshift(f);
    return {
      folder,
      path,
      folders: await Promise.all(ordered(folder.folderOrder, subs).map(cardData)),
      items: ordered(folder.order, items),
    };
  }, [id]);
}

export function useRecent(limit = 60) {
  return useDbQuery(async () => (await allItems()).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit), [limit]);
}

export function useSearch(q: string) {
  return useDbQuery(async () => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    const [folders, items] = await Promise.all([allFolders(), allItems()]);
    return {
      folders: await Promise.all(folders.filter((f) => f.parentId && f.title.toLowerCase().includes(s)).map(cardData)),
      items: items.filter((i) => i.name.toLowerCase().includes(s)),
    };
  }, [q]);
}

export function useStorageUsed(): number | null {
  return useDbQuery(async () => (await navigator.storage?.estimate?.())?.usage ?? null, []) ?? null;
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

/** Close a popover when clicking outside it or pressing Escape. */
export function usePopover(): [boolean, (v: boolean) => void, React.RefObject<HTMLDivElement>] {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return [open, setOpen, ref];
}
