// Collect files from a drop, remembering which (sub)folder each came from.
export interface DroppedFile {
  file: File;
  dirs: string[]; // folder path relative to what was dropped; [] for loose files
}

type Entry = FileSystemEntry;

function readAll(dir: FileSystemDirectoryEntry): Promise<Entry[]> {
  const reader = dir.createReader();
  const out: Entry[] = [];
  return new Promise((resolve, reject) => {
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(out);
        out.push(...batch);
        next();
      }, reject);
    next();
  });
}

async function walk(entry: Entry, dirs: string[]): Promise<DroppedFile[]> {
  if (entry.isFile) {
    return new Promise((resolve) =>
      (entry as FileSystemFileEntry).file((file) => resolve([{ file, dirs }]), () => resolve([]))
    );
  }
  if (entry.isDirectory) {
    const children = await readAll(entry as FileSystemDirectoryEntry);
    return (await Promise.all(children.map((c) => walk(c, [...dirs, entry.name])))).flat();
  }
  return [];
}

export async function filesFromDataTransfer(dt: DataTransfer): Promise<DroppedFile[]> {
  const entries = Array.from(dt.items)
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is Entry => !!e);
  if (!entries.length) return fromFileList(Array.from(dt.files));
  return (await Promise.all(entries.map((e) => walk(e, [])))).flat();
}

/** Files from an <input>; folder uploads carry their path in webkitRelativePath. */
export function fromFileList(files: File[]): DroppedFile[] {
  return files.map((file) => ({ file, dirs: (file.webkitRelativePath || '').split('/').slice(0, -1) }));
}

export const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

// What's being dragged inside the app (a file tile or a folder card).
export let dragging: { kind: 'item' | 'folder'; id: string } | null = null;
export const setDragging = (d: typeof dragging) => {
  dragging = d;
};
