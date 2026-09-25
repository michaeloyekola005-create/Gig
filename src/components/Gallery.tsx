import { useState } from 'react';
import { useElementWidth } from '../hooks';
import { columnsFor, masonry } from '../layout';
import type { Item, Layout } from '../types';
import { Tile } from './Tile';

interface Props {
  items: Item[];
  layout: Layout;
  onOpen: (index: number) => void;
  /** When given, tiles become draggable and show edit actions. */
  edit?: {
    coverId: string | null;
    onReorder: (ids: string[]) => void;
    onCover: (id: string) => void;
    onCaption: (item: Item) => void;
    onDelete: (item: Item) => void;
  };
}

export function Gallery({ items, layout, onOpen, edit }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const index = new Map(items.map((it, i) => [it.id, i]));

  const drop = (targetId: string) => {
    if (!edit || !dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id).filter((id) => id !== dragId);
    const at = ids.indexOf(targetId);
    const from = index.get(dragId)!;
    const to = index.get(targetId)!;
    ids.splice(from < to ? at + 1 : at, 0, dragId);
    edit.onReorder(ids);
  };

  const cell = (it: Item) => (
    <figure
      key={it.id}
      className={`cell ${dragId === it.id ? 'dragging' : ''} ${overId === it.id && dragId !== it.id ? 'over' : ''}`}
      draggable={!!edit}
      onDragStart={(e) => {
        setDragId(it.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-gig-item', it.id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setOverId(null);
      }}
      onDragOver={(e) => {
        if (!dragId) return;
        e.preventDefault();
        e.stopPropagation();
        setOverId(it.id);
      }}
      onDrop={(e) => {
        if (!dragId) return;
        e.preventDefault();
        e.stopPropagation();
        drop(it.id);
        setDragId(null);
        setOverId(null);
      }}
    >
      <button className="cell-open" onClick={() => onOpen(index.get(it.id)!)} aria-label={`Open ${it.name}`}>
        <Tile item={it} fit={layout === 'grid' ? 'cover' : 'natural'} />
      </button>
      {edit && (
        <div className="cell-actions">
          <button
            className={edit.coverId === it.id ? 'on' : ''}
            title={edit.coverId === it.id ? 'Cover image' : 'Make cover'}
            onClick={() => edit.onCover(it.id)}
            disabled={!it.hasThumb}
          >
            ★
          </button>
          <button title="Caption" onClick={() => edit.onCaption(it)}>
            Aa
          </button>
          <button title="Remove" onClick={() => edit.onDelete(it)}>
            ✕
          </button>
        </div>
      )}
      {it.caption && <figcaption>{it.caption}</figcaption>}
    </figure>
  );

  if (layout === 'masonry') {
    const cols = width ? masonry(items, columnsFor(width)) : [];
    return (
      <div ref={ref} className="gallery masonry">
        {cols.map((col, i) => (
          <div key={i} className="masonry-col">
            {col.map(cell)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={`gallery ${layout}`}>
      {items.map(cell)}
    </div>
  );
}
