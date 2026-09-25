import type { Item, Project } from './types';

// Everything lives in the browser (IndexedDB), so the app works offline and
// nothing leaves the device unless the user exports it.
type Store = 'projects' | 'items' | 'files' | 'thumbs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('gig', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('projects', { keyPath: 'id' });
      db.createObjectStore('items', { keyPath: 'id' }).createIndex('projectId', 'projectId');
      db.createObjectStore('files');
      db.createObjectStore('thumbs');
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

// --- change notifications -------------------------------------------------
const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function changed() {
  listeners.forEach((fn) => fn());
}

// --- projects ---------------------------------------------------------------
export async function listProjects(): Promise<Project[]> {
  const db = await open();
  const all = await wrap(db.transaction('projects').objectStore('projects').getAll());
  return (all as Project[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await open();
  return wrap(db.transaction('projects').objectStore('projects').get(id));
}

export async function saveProject(p: Project): Promise<void> {
  await tx(['projects'], 'readwrite', (t) => t.objectStore('projects').put({ ...p, updatedAt: Date.now() }));
  changed();
}

export async function deleteProject(id: string): Promise<void> {
  const items = await listItems(id);
  await tx(['projects', 'items', 'files', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('projects').delete(id);
    for (const it of items) {
      t.objectStore('items').delete(it.id);
      t.objectStore('files').delete(it.id);
      t.objectStore('thumbs').delete(it.id);
    }
  });
  changed();
}

// --- items -----------------------------------------------------------------
export async function listItems(projectId: string): Promise<Item[]> {
  const db = await open();
  const idx = db.transaction('items').objectStore('items').index('projectId');
  return wrap(idx.getAll(projectId)) as Promise<Item[]>;
}

export async function addItem(item: Item, file: Blob, thumb: Blob | null): Promise<void> {
  await tx(['items', 'files', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('items').put(item);
    t.objectStore('files').put(file, item.id);
    if (thumb) t.objectStore('thumbs').put(thumb, item.id);
  });
}

export async function saveItem(item: Item): Promise<void> {
  await tx(['items'], 'readwrite', (t) => t.objectStore('items').put(item));
  changed();
}

export async function deleteItem(id: string): Promise<void> {
  await tx(['items', 'files', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('items').delete(id);
    t.objectStore('files').delete(id);
    t.objectStore('thumbs').delete(id);
  });
  changed();
}

export async function getBlob(store: 'files' | 'thumbs', id: string): Promise<Blob | undefined> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(id));
}

export { changed as notifyChanged };
