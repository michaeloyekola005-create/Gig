import { useCallback, useEffect, useState } from 'react';
import { upload } from '../actions';
import { deleteItem, saveFolder, saveItem } from '../db';
import { askConfirm, askText } from '../dialog';
import type { DroppedFile } from '../drop';
import { dragging } from '../drop';
import { exportFolder } from '../export';
import { go, useFolder, usePopover } from '../hooks';
import { setStatus } from '../status';
import { ROOT, type Folder, type Item, type Layout } from '../types';
import { newFolder } from './Chrome';
import { PickFiles, WindowDrop } from './DropZone';
import { dropInto, FolderGrid, removeFolder, renameFolder } from './Folders';
import { Gallery } from './Gallery';
import { Icon, type IconName } from './Icons';
import { Lightbox } from './Lightbox';

const LAYOUTS: { id: Layout; label: string; icon: IconName }[] = [
  { id: 'grid', label: 'Grid', icon: 'grid' },
  { id: 'masonry', label: 'Masonry', icon: 'masonry' },
  { id: 'large', label: 'Large', icon: 'large' },
  { id: 'list', label: 'List', icon: 'list' },
];

async function share(f: Folder, items: Item[]) {
  setStatus('Preparing page…');
  try {
    await exportFolder(f, items, (n, t) => setStatus(`Preparing page… ${n}/${t}`));
    setStatus('Downloaded — send the file to anyone, it opens in any browser', 4000);
  } catch {
    setStatus('Could not create the page', 4000);
  }
}

export function FolderView({ id }: { id: string }) {
  const data = useFolder(id);
  const [open, setOpen] = useState<number | null>(null);
  const onDrop = useCallback((files: DroppedFile[]) => upload(files, id), [id]);

  // Paste screenshots straight in.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length || e.target instanceof HTMLInputElement) return;
      const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '.');
      upload(
        files.map((f) => ({ file: f.name === 'image.png' ? new File([f], `Screenshot ${stamp}.png`, { type: f.type }) : f, dirs: [] })),
        id
      );
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [id]);

  if (data === undefined) return null;
  if (data === null)
    return (
      <div className="empty-state">
        <p>This folder doesn’t exist anymore.</p>
        <a className="btn primary" href="#/">
          Go to My Drive
        </a>
      </div>
    );

  const { folder, path, folders, items } = data;
  const title = folder.id === ROOT ? 'My Drive' : folder.title;

  return (
    <>
      <WindowDrop label={`Drop to upload to “${title}”`} onDrop={onDrop} />
      <div className="view-head">
        <Breadcrumbs path={path} />
        <div className="toolbar">
          <div className="segmented" role="radiogroup" aria-label="Arrange as">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={folder.layout === l.id}
                className={folder.layout === l.id ? 'on' : ''}
                onClick={() => saveFolder({ ...folder, layout: l.id })}
                title={l.label}
              >
                <Icon name={l.icon} size={17} />
                <span className="hide-sm">{l.label}</span>
              </button>
            ))}
          </div>
          <FolderMore folder={folder} items={items} />
        </div>
      </div>

      {!folders.length && !items.length ? (
        <div className="empty-drop">
          <span className="drop-icon">
            <Icon name="upload" size={24} />
          </span>
          <strong>Drop files or folders here</strong>
          <span className="muted">or</span>
          <div className="empty-actions">
            <PickFiles className="btn primary" onFiles={(f) => upload(f, id)}>
              Upload files
            </PickFiles>
            <button className="btn" onClick={() => newFolder(id)}>
              New folder
            </button>
          </div>
        </div>
      ) : (
        <>
          {!!folders.length && (
            <section>
              <h3 className="section-title">Folders</h3>
              <FolderGrid folders={folders} parentId={folder.id} />
            </section>
          )}
          {!!items.length && (
            <section>
              <h3 className="section-title">Files</h3>
              <Gallery
                items={items}
                layout={folder.layout}
                onOpen={setOpen}
                edit={{
                  coverId: folder.coverId,
                  onReorder: (order) => saveFolder({ ...folder, order }),
                  onCover: (it) => saveFolder({ ...folder, coverId: folder.coverId === it.id ? null : it.id }),
                  onRename: async (it) => {
                    const name = await askText('Rename', it.name);
                    if (name?.trim()) await saveItem({ ...it, name: name.trim() });
                  },
                  onDelete: async (it) => {
                    if (!(await askConfirm(`Delete “${it.name}”?`, 'It will be removed from this device.'))) return;
                    await deleteItem(it.id);
                    await saveFolder({
                      ...folder,
                      order: folder.order.filter((x) => x !== it.id),
                      coverId: folder.coverId === it.id ? null : folder.coverId,
                    });
                  },
                }}
              />
            </section>
          )}
          <p className="hint muted">Drag to arrange · drop a file on a folder to move it · paste screenshots with Ctrl/⌘ V</p>
        </>
      )}
      {open !== null && <Lightbox items={items} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Breadcrumbs({ path }: { path: Folder[] }) {
  const [over, setOver] = useState<string | null>(null);
  return (
    <nav className="crumbs" aria-label="Folder path">
      {path.map((f, i) => {
        const last = i === path.length - 1;
        const label = f.id === ROOT ? 'My Drive' : f.title;
        return (
          <span key={f.id} className="crumb-wrap">
            {i > 0 && <Icon name="chevron" size={16} />}
            {last ? (
              <h1 className="crumb current">{label}</h1>
            ) : (
              <a
                className={`crumb ${over === f.id ? 'drop-into' : ''}`}
                href={f.id === ROOT ? '#/' : `#/f/${f.id}`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  setOver(f.id);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  dropInto(f.id);
                }}
              >
                {label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function FolderMore({ folder, items }: { folder: Folder; items: Item[] }) {
  const [open, setOpen, ref] = usePopover();
  const close = () => setOpen(false);
  const isRoot = folder.id === ROOT;
  return (
    <div className="popover-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="More" title="More">
        <Icon name="more" />
      </button>
      {open && (
        <div className="menu right" role="menu">
          <button onClick={() => (close(), newFolder(folder.id))}>
            <Icon name="folderPlus" /> New folder
          </button>
          <button disabled={!items.length} onClick={() => (close(), share(folder, items))}>
            <Icon name="share" /> Share as a page
          </button>
          {!isRoot && (
            <>
              <div className="menu-sep" />
              <button onClick={() => (close(), renameFolder(folder))}>
                <Icon name="pencil" /> Rename
              </button>
              <button
                className="danger-text"
                onClick={async () => {
                  close();
                  const parent = folder.parentId;
                  await removeFolder(folder);
                  go(parent && parent !== ROOT ? `/f/${parent}` : '/');
                }}
              >
                <Icon name="trash" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
