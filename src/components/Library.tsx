import { useCallback, useState } from 'react';
import { createProject, projectsFromGroups, upload } from '../actions';
import type { DropGroup } from '../drop';
import { go, useBlobUrl, useProjects, type ProjectSummary } from '../hooks';
import { PickFiles, WindowDrop } from './DropZone';

export function Library() {
  const projects = useProjects();
  const [q, setQ] = useState('');

  const onDrop = useCallback(async (groups: DropGroup[]) => {
    const made = await projectsFromGroups(groups);
    if (made.length === 1) go(`/p/${made[0].id}`);
  }, []);

  const onPick = async (files: File[]) => {
    const p = await createProject();
    go(`/p/${p.id}`);
    await upload(files, p.id);
  };

  const query = q.trim().toLowerCase();
  const shown = (projects ?? []).filter(
    (p) =>
      !query ||
      [p.title, p.client, p.description, ...p.tags].some((s) => s.toLowerCase().includes(query))
  );

  return (
    <div className="page">
      <WindowDrop label="Drop to create a project — each folder becomes its own" onDrop={onDrop} />
      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> Gig
        </div>
        {!!projects?.length && (
          <input className="search" placeholder="Search projects, clients, tags" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        <div className="topbar-actions">
          <button
            className="btn ghost"
            onClick={async () => {
              const p = await createProject();
              go(`/p/${p.id}`);
            }}
          >
            New project
          </button>
          <PickFiles onFiles={onPick} className="btn primary">
            Upload
          </PickFiles>
        </div>
      </header>

      {projects && projects.length === 0 && (
        <section className="empty">
          <h1>Your work deserves better than a file list.</h1>
          <p>Drop your designs or whole folders anywhere on this page. Gig arranges them into a clean, shareable portfolio.</p>
          <PickFiles onFiles={onPick} className="dropzone">
            <span className="drop-icon">↓</span>
            <strong>Drop files or folders here</strong>
            <span className="muted">or click to choose · images, video, PDF, anything</span>
          </PickFiles>
        </section>
      )}

      {!!shown.length && (
        <section className="projects">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </section>
      )}
      {!!projects?.length && !shown.length && <p className="muted center">No projects match “{q}”.</p>}
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectSummary }) {
  const visual = p.items.filter((i) => i.hasThumb);
  const coverId = p.coverId ?? visual[0]?.id;
  const others = visual.filter((i) => i.id !== coverId).slice(0, 2);
  const cover = useBlobUrl('thumbs', coverId);
  const a = useBlobUrl('thumbs', others[0]?.id);
  const b = useBlobUrl('thumbs', others[1]?.id);
  const color = p.items.find((i) => i.id === coverId)?.color ?? '#e7e5e4';

  return (
    <a className="project-card" href={`#/p/${p.id}`}>
      <div className={`mosaic ${others.length ? 'with-side' : ''}`} style={{ background: color }}>
        {cover ? <img src={cover} alt="" /> : <div className="mosaic-empty">{p.items.length ? `${p.items.length} files` : 'Empty'}</div>}
        {!!others.length && (
          <div className="mosaic-side">
            {a && <img src={a} alt="" />}
            {b && <img src={b} alt="" />}
          </div>
        )}
      </div>
      <div className="project-meta">
        <strong>{p.title || 'Untitled project'}</strong>
        <span className="muted">
          {[p.client, `${p.items.length} item${p.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </span>
      </div>
    </a>
  );
}
