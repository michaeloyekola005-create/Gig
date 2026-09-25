import { useState } from 'react';
import { deleteFolder, getFolder, getItem, moveFolder, moveItem, saveFolder } from '../db';
import { askConfirm, askText } from '../dialog';
import { dragging, setDragging } from '../drop';
import { go, type FolderCardData } from '../hooks';
import { reorder } from '../layout';
import type { Folder } from '../types';
import { Icon } from './Icons';
import { Thumb } from './Tile';

type Mode = 'before' | 'after' | 'into';

/** Drop whatever is being dragged (a file or folder) into `folderId`. */
export async function dropInto(folderId: string) {
  const d = dragging;
  setDragging(null);
  if (!d) return;
  if (d.kind === 'folder') return moveFolder(d.id, folderId);
  const item = await getItem(d.id);
  if (item) await moveItem(item, folderId);
}

export async function renameFolder(f: Folder) {
  const title = await askText('Rename folder', f.title);
  if (title?.trim()) await saveFolder({ ...f, title: title.trim() });
}

export async function removeFolder(f: Folder) {
  if (await askConfirm(`Delete “${f.title}”?`, 'The folder and everything inside it will be removed from this device.')) {
    await deleteFolder(f.id);
  }
}

export function FolderGrid({ folders, parentId }: { folders: FolderCardData[]; parentId: string | null }) {
  const [over, setOver] = useState<{ id: string; mode: Mode } | null>(null);

  const modeOf = (e: React.DragEvent): Mode => {
    if (dragging?.kind !== 'folder' || !parentId) return 'into';
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    return x < 0.25 ? 'before' : x > 0.75 ? 'after' : 'into';
  };

  return (
    <div className="folders">
      {folders.map((f) => (
        <div
          key={f.id}
          className={`folder-card ${over?.id === f.id ? `drop-${over.mode}` : ''} ${dragging?.id === f.id ? 'dragging' : ''}`}
          draggable
          onDragStart={(e) => {
            setDragging({ kind: 'folder', id: f.id });
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', f.title);
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onDragOver={(e) => {
            if (!dragging || dragging.id === f.id) return;
            e.preventDefault();
            e.stopPropagation();
            setOver({ id: f.id, mode: modeOf(e) });
          }}
          onDragLeave={() => setOver(null)}
          onDrop={async (e) => {
            if (!dragging) return;
            e.preventDefault();
            e.stopPropagation();
            const mode = modeOf(e);
            const d = dragging; // read before awaiting: dragend clears it
            setOver(null);
            if (mode === 'into') return dropInto(f.id);
            setDragging(null);
            const parent = parentId && (await getFolder(parentId));
            if (parent) {
              const ids = folders.map((x) => x.id);
              await saveFolder({ ...parent, folderOrder: reorder(ids, d.id, f.id, mode) });
            }
          }}
          onClick={() => go(`/f/${f.id}`)}
          onKeyDown={(e) => e.key === 'Enter' && go(`/f/${f.id}`)}
          tabIndex={0}
          role="link"
        >
          <div className={`folder-preview n${f.previews.length}`}>
            {f.previews.length ? (
              f.previews.map((it) => (
                <span key={it.id} style={{ background: it.color }}>
                  <Thumb item={it} />
                </span>
              ))
            ) : (
              <span className="folder-empty">
                <Icon name="folder" size={34} />
              </span>
            )}
          </div>
          <div className="folder-meta">
            <Icon name="folder" size={18} fill />
            <div>
              <strong title={f.title}>{f.title}</strong>
              <span className="muted">
                {f.count} item{f.count === 1 ? '' : 's'}
              </span>
            </div>
            <FolderMenu f={f} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderMenu({ f }: { f: Folder }) {
  return (
    <span className="folder-actions" onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn small" title="Rename" onClick={() => renameFolder(f)}>
        <Icon name="pencil" size={15} />
      </button>
      <button className="icon-btn small" title="Delete" onClick={() => removeFolder(f)}>
        <Icon name="trash" size={15} />
      </button>
    </span>
  );
}
