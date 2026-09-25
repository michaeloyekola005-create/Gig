import { useState } from 'react';
import { useRecent, useSearch } from '../hooks';
import { FolderGrid } from './Folders';
import { Gallery } from './Gallery';
import { Lightbox } from './Lightbox';

export function RecentView() {
  const items = useRecent();
  const [open, setOpen] = useState<number | null>(null);
  if (!items) return null;
  return (
    <>
      <div className="view-head">
        <h1 className="crumb current">Recent</h1>
      </div>
      {items.length ? (
        <Gallery items={items} layout="grid" onOpen={setOpen} />
      ) : (
        <p className="empty-state muted">Files you upload will show up here.</p>
      )}
      {open !== null && <Lightbox items={items} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function SearchView({ query }: { query: string }) {
  const res = useSearch(query);
  const [open, setOpen] = useState<number | null>(null);
  if (!res) return null;
  const none = !res.folders.length && !res.items.length;
  return (
    <>
      <div className="view-head">
        <h1 className="crumb current">Results for “{query.trim()}”</h1>
      </div>
      {none && <p className="empty-state muted">Nothing matches that name.</p>}
      {!!res.folders.length && (
        <section>
          <h3 className="section-title">Folders</h3>
          <FolderGrid folders={res.folders} parentId={null} />
        </section>
      )}
      {!!res.items.length && (
        <section>
          <h3 className="section-title">Files</h3>
          <Gallery items={res.items} layout="grid" onOpen={setOpen} />
        </section>
      )}
      {open !== null && <Lightbox items={res.items} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
