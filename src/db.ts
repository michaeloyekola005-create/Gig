import { ROOT, type Folder, type Item, type Layout } from './types';

// Everything lives in the browser (IndexedDB), so the app works offline and
// nothing leaves the device unless the user downloads or shares it.
type Store = 'folders' | 'items' | 'files' | 'thumbs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('gig', 2);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const t = req.transaction!;
      if (e.oldVersion < 1) {
        db.createObjectStore('files');
        db.createObjectStore('thumbs');
        db.createObjectStore('items', { keyPath: 'id' });
      }
      db.createObjectStore('folders', { keyPath: 'id' }).createIndex('parentId', 'parentId');
      const items = t.objectStore('items');
      items.createIndex('folderId', 'folderId');

      if (e.oldVersion === 1) {
        // v1 had flat "projects"; each becomes a folder in My Files.
        const folders = t.objectStore('folders');
        const rootOrder: string[] = [];
        t.objectStore('projects').openCursor().onsuccess = function () {
          const cur = this.result;
          if (cur) {
            const p = cur.value;
            rootOrder.push(p.id);
            folders.put({
              id: p.id, title: p.title, parentId: ROOT, layout: p.layout === 'showcase' ? 'large' : p.layout,
              coverId: p.coverId, order: p.order, folderOrder: [], createdAt: p.createdAt, updatedAt: p.updatedAt,
            } satisfies Folder);
            return cur.continue();
          }
          folders.put({ ...newRoot(), folderOrder: rootOrder });
          db.deleteObjectStore('projects');
        };
        items.openCursor().onsuccess = function () {
          const cur = this.result;
          if (!cur) return items.deleteIndex('projectId');
          const { projectId, caption: _c, ...rest } = cur.value;
          cur.update({ ...rest, folderId: projectId });
          cur.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(stores: Store[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => void): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    fn(t);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

async function read<T>(store: Store, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return wrap(fn(db.transaction(store).objectStore(store)));
}

// --- change notifications -------------------------------------------------
const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notifyChanged() {
  listeners.forEach((fn) => fn());
}

// --- folders --------------------------------------------------------------
function newRoot(): Folder {
  return {
    id: ROOT, title: 'My Files', parentId: null, layout: 'grid', coverId: null,
    order: [], folderOrder: [], createdAt: 0, updatedAt: 0,
  };
}

const LAYOUTS: Layout[] = ['grid', 'masonry', 'large', 'list'];

export async function getFolder(id: string): Promise<Folder | undefined> {
  const f = await read<Folder | undefined>('folders', (s) => s.get(id));
  if (!f) return id === ROOT ? newRoot() : undefined;
  return { ...f, folderOrder: f.folderOrder ?? [], layout: LAYOUTS.includes(f.layout) ? f.layout : 'grid' };
}

export const listFolders = (parentId: string) =>
  read<Folder[]>('folders', (s) => s.index('parentId').getAll(parentId));
export const allFolders = () => read<Folder[]>('folders', (s) => s.getAll());

export async function saveFolder(f: Folder): Promise<void> {
  await tx(['folders'], 'readwrite', (t) => t.objectStore('folders').put({ ...f, updatedAt: Date.now() }));
  notifyChanged();
}

/** Ids of a folder and everything nested in it. */
async function descendants(id: string): Promise<string[]> {
  const out = [id];
  for (let i = 0; i < out.length; i++) out.push(...(await listFolders(out[i])).map((f) => f.id));
  return out;
}

export async function isInside(folderId: string, ancestorId: string): Promise<boolean> {
  for (let f = await getFolder(folderId); f; f = f.parentId ? await getFolder(f.parentId) : undefined) {
    if (f.id === ancestorId) return true;
  }
  return false;
}

export async function deleteFolder(id: string): Promise<void> {
  const folder = await getFolder(id);
  const ids = await descendants(id);
  const items = (await Promise.all(ids.map(listItems))).flat();
  const parent = folder?.parentId ? await getFolder(folder.parentId) : undefined;
  await tx(['folders', 'items', 'files', 'thumbs'], 'readwrite', (t) => {
    for (const f of ids) t.objectStore('folders').delete(f);
    for (const it of items) {
      t.objectStore('items').delete(it.id);
      t.objectStore('files').delete(it.id);
      t.objectStore('thumbs').delete(it.id);
    }
    if (parent) t.objectStore('folders').put({ ...parent, folderOrder: parent.folderOrder.filter((x) => x !== id) });
  });
  notifyChanged();
}

export async function moveFolder(id: string, toId: string): Promise<boolean> {
  const f = await getFolder(id);
  if (!f || f.parentId === toId || (await isInside(toId, id))) return false;
  const from = await getFolder(f.parentId!);
  const to = await getFolder(toId);
  if (!from || !to) return false;
  await tx(['folders'], 'readwrite', (t) => {
    const s = t.objectStore('folders');
    s.put({ ...f, parentId: toId });
    s.put({ ...from, folderOrder: from.folderOrder.filter((x) => x !== id) });
    s.put({ ...to, folderOrder: [...to.folderOrder, id], updatedAt: Date.now() });
  });
  notifyChanged();
  return true;
}

// --- items ----------------------------------------------------------------
export const listItems = (folderId: string) => read<Item[]>('items', (s) => s.index('folderId').getAll(folderId));
export const allItems = () => read<Item[]>('items', (s) => s.getAll());

export async function addItem(item: Item, file: Blob, thumb: Blob | null): Promise<void> {
  await tx(['items', 'files', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('items').put(item);
    t.objectStore('files').put(file, item.id);
    if (thumb) t.objectStore('thumbs').put(thumb, item.id);
  });
}

export async function saveItem(item: Item): Promise<void> {
  await tx(['items'], 'readwrite', (t) => t.objectStore('items').put(item));
  notifyChanged();
}

export async function deleteItem(id: string): Promise<void> {
  await tx(['items', 'files', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('items').delete(id);
    t.objectStore('files').delete(id);
    t.objectStore('thumbs').delete(id);
  });
  notifyChanged();
}

export async function moveItem(item: Item, toId: string): Promise<void> {
  if (item.folderId === toId) return;
  const from = await getFolder(item.folderId);
  const to = await getFolder(toId);
  if (!to) return;
  await tx(['items', 'folders'], 'readwrite', (t) => {
    t.objectStore('items').put({ ...item, folderId: toId });
    const s = t.objectStore('folders');
    if (from) {
      s.put({
        ...from,
        order: from.order.filter((x) => x !== item.id),
        coverId: from.coverId === item.id ? null : from.coverId,
      });
    }
    s.put({ ...to, order: [...to.order, item.id], coverId: to.coverId ?? (item.hasThumb ? item.id : null), updatedAt: Date.now() });
  });
  notifyChanged();
}

export async function getBlob(store: 'files' | 'thumbs', id: string): Promise<Blob | undefined> {
  return read<Blob | undefined>(store, (s) => s.get(id));
}

export const getItem = (id: string) => read<Item | undefined>('items', (s) => s.get(id));
