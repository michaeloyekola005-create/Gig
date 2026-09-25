import { useCallback, useEffect, useState } from 'react';
import { upload } from '../actions';
import { deleteItem, deleteProject, saveItem, saveProject } from '../db';
import type { DropGroup } from '../drop';
import { exportProject } from '../export';
import { go, useProject } from '../hooks';
import { setStatus } from '../status';
import type { Item, Layout, Project } from '../types';
import { PickFiles, WindowDrop } from './DropZone';
import { Gallery } from './Gallery';
import { Lightbox } from './Lightbox';

const LAYOUTS: { id: Layout; label: string }[] = [
  { id: 'masonry', label: 'Masonry' },
  { id: 'grid', label: 'Grid' },
  { id: 'showcase', label: 'Showcase' },
];

export async function runExport(p: Project, items: Item[]) {
  setStatus('Building website…');
  try {
    await exportProject(p, items, (n, t) => setStatus(`Building website… ${n}/${t}`));
    setStatus('Website downloaded — send it to your client or host it anywhere', 4000);
  } catch {
    setStatus('Export failed', 4000);
  }
}

export function ProjectPage({ id, present }: { id: string; present: boolean }) {
  const data = useProject(id);
  const [open, setOpen] = useState<number | null>(null);

  const onDrop = useCallback((groups: DropGroup[]) => upload(groups.flatMap((g) => g.files), id), [id]);

  // Paste screenshots straight in.
  useEffect(() => {
    if (present) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        upload(
          files.map((f) => (f.name === 'image.png' ? new File([f], `Pasted ${new Date().toLocaleString()}.png`, { type: f.type }) : f)),
          id
        );
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [id, present]);

  if (data === undefined) return null;
  if (data === null)
    return (
      <div className="page center">
        <p>This project doesn’t exist anymore.</p>
        <a className="btn" href="#/">
          Back to library
        </a>
      </div>
    );

  const { project: p, items } = data;
  const update = (patch: Partial<Project>) => saveProject({ ...p, ...patch });
  const lightbox = open !== null && <Lightbox items={items} start={open} onClose={() => setOpen(null)} />;

  if (present) {
    return (
      <div className="present">
        <header className="hero">
          <h1>{p.title || 'Untitled project'}</h1>
          {(p.client || p.tags.length > 0) && (
            <div className="hero-meta">{[p.client && `for ${p.client}`, ...p.tags].filter(Boolean).join(' · ')}</div>
          )}
          {p.description && <p className="hero-desc">{p.description}</p>}
        </header>
        <main className="present-body">
          <Gallery items={items} layout={p.layout} onOpen={setOpen} />
        </main>
        <nav className="float-bar">
          <a className="btn ghost" href={`#/p/${p.id}`}>
            Edit
          </a>
          {!!items.length && (
            <button className="btn ghost" onClick={() => setOpen(0)}>
              Slideshow
            </button>
          )}
          <button className="btn primary" onClick={() => runExport(p, items)} disabled={!items.length}>
            Export website
          </button>
        </nav>
        {lightbox}
      </div>
    );
  }

  return (
    <div className="page">
      <WindowDrop label={`Drop to add to “${p.title || 'this project'}”`} onDrop={onDrop} />
      <header className="topbar">
        <a className="btn ghost" href="#/">
          ← Library
        </a>
        <div className="segmented" role="tablist" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button key={l.id} role="tab" aria-selected={p.layout === l.id} className={p.layout === l.id ? 'on' : ''} onClick={() => update({ layout: l.id })}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="topbar-actions">
          <PickFiles onFiles={(f) => upload(f, p.id)} className="btn ghost">
            Add files
          </PickFiles>
          <a className="btn primary" href={`#/p/${p.id}/present`}>
            Present
          </a>
        </div>
      </header>

      <section className="details">
        <input
          className="title-input"
          placeholder="Untitled project"
          defaultValue={p.title}
          key={`t${p.id}`}
          onBlur={(e) => e.target.value !== p.title && update({ title: e.target.value.trim() })}
        />
        <div className="meta-row">
          <input
            placeholder="Client"
            defaultValue={p.client}
            key={`c${p.id}`}
            onBlur={(e) => e.target.value !== p.client && update({ client: e.target.value.trim() })}
          />
          <input
            placeholder="Tags — branding, web, 2026"
            defaultValue={p.tags.join(', ')}
            key={`g${p.id}`}
            onBlur={(e) =>
              update({
                tags: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <textarea
          placeholder="What was the brief? What did you do? A few lines is plenty."
          defaultValue={p.description}
          key={`d${p.id}`}
          rows={2}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${t.scrollHeight}px`;
          }}
          onBlur={(e) => e.target.value !== p.description && update({ description: e.target.value })}
        />
      </section>

      {items.length === 0 ? (
        <PickFiles onFiles={(f) => upload(f, p.id)} className="dropzone">
          <span className="drop-icon">↓</span>
          <strong>Drop designs here</strong>
          <span className="muted">or click to choose · you can also paste screenshots</span>
        </PickFiles>
      ) : (
        <>
          <p className="hint muted">Drag to reorder · ★ sets the cover · paste screenshots with Ctrl/⌘ V</p>
          <Gallery
            items={items}
            layout={p.layout}
            onOpen={setOpen}
            edit={{
              coverId: p.coverId,
              onReorder: (order) => update({ order }),
              onCover: (coverId) => update({ coverId }),
              onCaption: (it) => {
                const caption = prompt('Caption', it.caption);
                if (caption !== null) saveItem({ ...it, caption: caption.trim() });
              },
              onDelete: async (it) => {
                await deleteItem(it.id);
                await update({
                  order: p.order.filter((x) => x !== it.id),
                  coverId: p.coverId === it.id ? items.find((x) => x.id !== it.id && x.hasThumb)?.id ?? null : p.coverId,
                });
              },
            }}
          />
        </>
      )}

      <footer className="danger">
        <button className="btn ghost" onClick={() => runExport(p, items)} disabled={!items.length}>
          Export as website
        </button>
        <button
          className="btn ghost danger-btn"
          onClick={async () => {
            if (confirm(`Delete “${p.title || 'Untitled project'}” and all ${items.length} files?`)) {
              await deleteProject(p.id);
              go('/');
            }
          }}
        >
          Delete project
        </button>
      </footer>
      {lightbox}
    </div>
  );
}
