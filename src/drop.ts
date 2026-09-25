// Turn a drop into groups of files. Each dropped folder becomes its own group
// (so dropping 3 client folders makes 3 projects); loose files share one group.
export interface DropGroup {
  name: string | null;
  files: File[];
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

async function walk(entry: Entry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([])));
  }
  if (entry.isDirectory) {
    const children = await readAll(entry as FileSystemDirectoryEntry);
    return (await Promise.all(children.map(walk))).flat();
  }
  return [];
}

export async function groupsFromDataTransfer(dt: DataTransfer): Promise<DropGroup[]> {
  const entries = Array.from(dt.items)
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is Entry => !!e);

  if (!entries.length) return [{ name: null, files: Array.from(dt.files) }];

  const groups: DropGroup[] = [];
  const loose: File[] = [];
  for (const e of entries) {
    if (e.isDirectory) groups.push({ name: e.name, files: await walk(e) });
    else loose.push(...(await walk(e)));
  }
  if (loose.length) groups.unshift({ name: null, files: loose });
  return groups.filter((g) => g.files.length);
}

export const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
