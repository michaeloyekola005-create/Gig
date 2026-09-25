import { getFolder, saveFolder } from './db';
import type { DroppedFile } from './drop';
import { ingestFiles } from './media';
import { setStatus } from './status';
import type { Folder } from './types';
import { uid } from './util';

export async function createFolder(parentId: string, title = 'Untitled folder'): Promise<Folder> {
  const f: Folder = {
    id: uid(), title, parentId, layout: 'grid', coverId: null, order: [], folderOrder: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await saveFolder(f);
  const parent = await getFolder(parentId);
  if (parent) await saveFolder({ ...parent, folderOrder: [...parent.folderOrder, f.id] });
  return f;
}

/**
 * Upload into a folder. Dropped folders are recreated (with their sub-folders),
 * just like dragging a folder into Drive.
 */
export async function upload(dropped: DroppedFile[], parentId: string) {
  const files = dropped.filter((d) => !d.file.name.startsWith('.'));
  if (!files.length) return;
  const total = files.length;
  let done = 0;
  setStatus(`Uploading ${total} file${total > 1 ? 's' : ''}…`);

  const folderFor = new Map<string, Promise<string>>([['', Promise.resolve(parentId)]]);
  const ensure = (dirs: string[]): Promise<string> => {
    const key = dirs.join('/');
    let p = folderFor.get(key);
    if (!p) {
      p = ensure(dirs.slice(0, -1)).then((pid) => createFolder(pid, dirs[dirs.length - 1]).then((f) => f.id));
      folderFor.set(key, p);
    }
    return p;
  };

  const groups = new Map<string, DroppedFile[]>();
  for (const d of files) {
    const key = d.dirs.join('/');
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  for (const group of groups.values()) {
    const folderId = await ensure(group[0].dirs);
    await ingestFiles(group.map((g) => g.file), folderId, () => setStatus(`Uploading ${++done} of ${total}…`));
  }
  setStatus(`Uploaded ${total} file${total > 1 ? 's' : ''}`, 2500);
}
